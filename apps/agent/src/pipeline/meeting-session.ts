import type { BotRuntime, JoinSession, JoinOptions, RuntimeEvent } from '../runtime/types';
import type { AudioCapture } from '../audio/types';
import type { SttProvider, LlmProvider } from '@hal/media';
import {
  summarizeTranscript,
  summaryToMarkdown,
  transcriptToJson,
  transcriptToMarkdown,
  type Transcript,
  type MeetingSummary,
} from '@hal/media';
import type { EnvelopeService } from '@hal/crypto';
import type { Repositories } from '@hal/db';
import type { EmailSender, SendEmailInput } from '../email/resend';
import type { Logger } from '../logger';

export interface MeetingSessionDeps {
  runtime: BotRuntime;
  audio: AudioCapture;
  stt: SttProvider;
  llm: LlmProvider;
  envelope: EnvelopeService;
  repos: Repositories;
  email?: EmailSender;
  fromEmail: string;
  log: Logger;
}

export interface MeetingSessionContext {
  workspaceId: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  userWrappedDek: Uint8Array;
  userKeyId: string;
  meetingId: string;
  meetingUrl: string;
  meetingTitle?: string;
  mode: 'listen' | 'chat' | 'speak';
  disclosure: string;
  botDisplayName: string;
}

export interface MeetingSessionResult {
  transcript: Transcript;
  summary: MeetingSummary;
  transcriptId: string;
  emailId?: string;
  endedReason: 'host-ended' | 'kill-requested' | 'kicked' | 'error';
}

/**
 * One full meeting-session lifecycle:
 *
 *   1. Bot joins meeting (runtime).
 *   2. Audio capture begins, piping PCM to STT.
 *   3. Events from the runtime are recorded to audit_log.
 *   4. When the call ends, audio capture stops, STT finalizes, summary is generated.
 *   5. Transcript + summary are encrypted with the user's DEK and persisted.
 *   6. Email is sent to the user with the summary inline.
 *
 * All of this is observable via the logger and audit log.
 */
export async function runMeetingSession(
  deps: MeetingSessionDeps,
  ctx: MeetingSessionContext,
): Promise<MeetingSessionResult> {
  const { runtime, audio, stt, llm, envelope, repos, log, email, fromEmail } = deps;

  // Mark meeting in-progress.
  await repos.meetings.updateStatus(ctx.meetingId, 'joining');

  // 1. Start STT stream first so the audio pipeline has a sink.
  const sttSession = await stt.startStream({
    sampleRate: 16000,
    channels: 1,
    encoding: 's16le',
    diarize: true,
    language: 'en',
  });

  // Forward STT events into the log.
  sttSession.on((e) => {
    if (e.kind === 'final') log.info({ line: e.line.text.slice(0, 80) }, 'stt final');
    if (e.kind === 'error') log.error({ err: e.error.message }, 'stt error');
  });

  // 2. Begin audio capture, pipe to STT.
  await audio.start();
  const unsubAudio = audio.onPcm((chunk) => {
    try {
      sttSession.write(chunk);
    } catch (e) {
      log.warn({ err: (e as Error).message }, 'stt write failed');
    }
  });

  // 3. Join the meeting.
  const joinOpts: JoinOptions = {
    meetingUrl: ctx.meetingUrl,
    userId: ctx.userId,
    userDisplayName: ctx.userDisplayName,
    meetingId: ctx.meetingId,
    mode: ctx.mode,
    disclosure: ctx.disclosure,
    botDisplayName: ctx.botDisplayName,
  };

  let endedReason: MeetingSessionResult['endedReason'] = 'host-ended';
  let session: JoinSession;
  try {
    session = await runtime.join(joinOpts, log);
  } catch (e) {
    log.error({ err: (e as Error).message }, 'runtime.join failed');
    await audio.stop();
    await sttSession.abort();
    await repos.meetings.updateStatus(ctx.meetingId, 'failed', {
      failureReason: (e as Error).message,
    });
    throw e;
  }

  await repos.meetings.updateStatus(ctx.meetingId, 'in-progress', { actualStart: new Date() });
  await repos.auditLog.record({
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    meetingId: ctx.meetingId,
    action: 'bot_joined',
    actor: 'bot',
    details: { platform: runtime.platform, mode: ctx.mode },
  });

  // 4. Wait for the meeting to end (kill, kicked, or naturally).
  const ended = await new Promise<RuntimeEvent>((resolve) => {
    const unsub = session.on((e) => {
      switch (e.kind) {
        case 'disclosed':
          repos.auditLog
            .record({
              workspaceId: ctx.workspaceId,
              userId: ctx.userId,
              meetingId: ctx.meetingId,
              action: 'bot_disclosed',
              actor: 'bot',
              details: {},
            })
            .catch(() => undefined);
          break;
        case 'chat-message':
          repos.auditLog
            .record({
              workspaceId: ctx.workspaceId,
              userId: ctx.userId,
              meetingId: ctx.meetingId,
              action: 'bot_chatted',
              actor: 'system',
              details: { from: e.from, len: e.text.length },
            })
            .catch(() => undefined);
          break;
        case 'kill-requested':
          endedReason = 'kill-requested';
          unsub();
          resolve(e);
          break;
        case 'kicked':
          endedReason = 'kicked';
          unsub();
          resolve(e);
          break;
        case 'left':
          unsub();
          resolve(e);
          break;
        case 'error':
          endedReason = 'error';
          unsub();
          resolve(e);
          break;
      }
    });
  });

  log.info({ endedReason, lastEvent: ended.kind }, 'meeting ended');

  // 5. Stop audio + finalize STT.
  unsubAudio();
  await audio.stop();
  const transcript = await sttSession.end();

  // 6. Summarize.
  let summary: MeetingSummary;
  try {
    summary = await summarizeTranscript(llm, transcript);
  } catch (e) {
    log.error({ err: (e as Error).message }, 'summarize failed');
    summary = {
      overview: 'Hal was unable to generate a summary for this meeting.',
      decisions: [],
      actionItems: [],
      openQuestions: [],
      attendees: transcript.speakers,
      risks: [],
    };
  }

  // 7. Encrypt + persist.
  const contentJson = transcriptToJson(transcript);
  const contentCt = await envelope.encryptString({
    wrappedDek: ctx.userWrappedDek,
    keyId: ctx.userKeyId,
    plaintext: contentJson,
  });
  const summaryCt = await envelope.encryptJson({
    wrappedDek: ctx.userWrappedDek,
    keyId: ctx.userKeyId,
    value: summary,
  });
  const actionItemsCt = await envelope.encryptJson({
    wrappedDek: ctx.userWrappedDek,
    keyId: ctx.userKeyId,
    value: summary.actionItems,
  });

  const created = await repos.transcripts.create({
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    meetingId: ctx.meetingId,
    contentCt,
    summaryCt,
    actionItemsCt,
    durationSeconds: String(transcript.durationSec),
    speakerCount: String(transcript.speakers.length),
    sttProvider: transcript.sttProvider,
    llmProvider: llm.name,
  });

  await repos.meetings.updateStatus(ctx.meetingId, 'completed', { actualEnd: new Date() });
  await repos.auditLog.record({
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    meetingId: ctx.meetingId,
    action: 'transcript_created',
    actor: 'system',
    details: {
      transcriptId: created.id,
      durationSec: transcript.durationSec,
      lines: transcript.lines.length,
    },
  });

  // 8. Email the user.
  let emailId: string | undefined;
  if (email) {
    try {
      const text = summaryToMarkdown(summary);
      const subj = `Hal: ${ctx.meetingTitle ?? 'your meeting'} — summary ready`;
      const body: SendEmailInput = {
        from: fromEmail,
        to: ctx.userEmail,
        subject: subj,
        text,
        html: markdownToBasicHtml(text),
      };
      const sent = await email.send(body);
      emailId = sent.id;
      await repos.auditLog.record({
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        meetingId: ctx.meetingId,
        action: 'email_sent',
        actor: 'system',
        details: { emailId: sent.id },
      });
    } catch (e) {
      log.error({ err: (e as Error).message }, 'email send failed');
    }
  }

  return {
    transcript,
    summary,
    transcriptId: created.id,
    emailId,
    endedReason,
  };
}

function markdownToBasicHtml(md: string): string {
  // Trivial converter: paragraphs + simple **bold** + line breaks. Good
  // enough for an MVP summary email; swap in marked/markdown-it later.
  const escaped = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const withItal = withBold.replace(/_(.+?)_/g, '<em>$1</em>');
  const paras = withItal
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('\n');
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.55;color:#0b0b0b;max-width:640px;margin:32px auto;">${paras}</body></html>`;
}
