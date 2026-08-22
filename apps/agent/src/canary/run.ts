import type { AudioCapture } from '../audio/types';
import type { SttProvider } from '@hal/media';
import type { BotRuntime, JoinSession, RuntimeEvent } from '../runtime/types';
import type { Logger } from '../logger';
import {
  audioIsSilent,
  formatReport,
  peakAmplitude,
  step,
  summarize,
  type CanaryReport,
  type StepResult,
} from './checks';

export interface CanaryOptions {
  meetingUrl: string;
  botDisplayName: string;
  disclosure: string;
  /** How long to stay in the meeting collecting audio. */
  dwellMs?: number;
  /** Fail the audio step if fewer than this many bytes arrive at all. */
  minBytes?: number;
}

export interface CanaryDeps {
  runtime: BotRuntime;
  audio: AudioCapture;
  stt: SttProvider;
  log: Logger;
}

/**
 * Drive the whole pipeline against a meeting the operator owns, and report
 * which stage broke.
 *
 * The point is not that it joins. Four separate failures this week each passed
 * every check up to the one that mattered: a join button that was found and
 * disabled, a name that was typed and cleared, a signed-in browser missing one
 * flag, and thirty minutes of a perfectly healthy recording of pure silence.
 * So every stage is asserted independently, and the audio stage looks at the
 * samples rather than at whether the capture process is alive.
 *
 * No user is involved. That is the whole idea: the DOM will change again, and
 * the cost of finding out should be a failed canary rather than a failed
 * meeting someone was relying on.
 */
export async function runCanary(
  deps: CanaryDeps,
  opts: CanaryOptions,
): Promise<CanaryReport> {
  const { runtime, audio, stt, log } = deps;
  const dwellMs = opts.dwellMs ?? 45_000;
  const minBytes = opts.minBytes ?? 16_000;

  const steps: StepResult[] = [];
  const chunks: Uint8Array[] = [];
  let sttLines = 0;
  let disclosed = false;
  let session: JoinSession | null = null;

  const sttSession = await stt.startStream({
    sampleRate: 16000,
    channels: 1,
    encoding: 's16le',
    diarize: false,
    language: 'en',
  });
  sttSession.on((e) => {
    if (e.kind === 'final' && e.line.text.trim()) sttLines += 1;
  });

  await audio.start();
  const unsubAudio = audio.onPcm((chunk) => {
    chunks.push(chunk);
    try {
      sttSession.write(chunk);
    } catch {
      // The transcript step will report the consequence.
    }
  });

  try {
    try {
      session = await runtime.join(
        {
          meetingUrl: opts.meetingUrl,
          userId: 'canary',
          userDisplayName: 'Canary',
          meetingId: 'canary',
          mode: 'listen',
          disclosure: opts.disclosure,
          botDisplayName: opts.botDisplayName,
        },
        log,
      );
      steps.push(step('join', true, 'browser reached the meeting'));
      steps.push(step('admitted', true, 'admitted to the call'));
    } catch (e) {
      // join() covers navigation, the form, the click and admission. The
      // runtime already logs a page inventory on the way out, so the message
      // here is a pointer, not the diagnosis.
      const message = (e as Error).message;
      steps.push(step('join', false, message));
      steps.push(step('admitted', false, 'never got in'));
      return finish(steps, log);
    }

    session.on((event: RuntimeEvent) => {
      if (event.kind === 'disclosed') disclosed = true;
    });

    // Admission and the disclosure are both inside join(), so reaching here
    // means the disclosure was posted — the runtime throws otherwise.
    disclosed = true;
    steps.push(step('disclosed', true, 'announced itself in the chat'));

    await new Promise((resolve) => setTimeout(resolve, dwellMs));

    const pcm = concat(chunks);
    if (pcm.length < minBytes) {
      steps.push(
        step('audio', false, `only ${pcm.length} bytes captured in ${Math.round(dwellMs / 1000)}s`),
      );
    } else if (audioIsSilent(pcm)) {
      steps.push(
        step(
          'audio',
          false,
          `${pcm.length} bytes captured and every sample is zero — the browser is rendering no audio`,
        ),
      );
    } else {
      steps.push(step('audio', true, `${pcm.length} bytes, peak amplitude ${peakAmplitude(pcm)}`));
    }
  } finally {
    unsubAudio();
    await audio.stop().catch(() => undefined);
    try {
      await session?.leave('canary finished');
      steps.push(step('left', true, 'left the meeting cleanly'));
    } catch (e) {
      steps.push(step('left', false, (e as Error).message));
    }
    await sttSession.end().catch(() => undefined);
  }

  steps.push(
    sttLines > 0
      ? step('transcript', true, `${sttLines} final line(s) from speech-to-text`)
      : step(
          'transcript',
          false,
          disclosed
            ? 'no transcript lines — audio reached the sink but nothing came back from STT'
            : 'no transcript lines',
        ),
  );

  return finish(steps, log);
}

function finish(steps: StepResult[], log: Logger): CanaryReport {
  const report = summarize(steps);
  const text = formatReport(report);
  if (report.ok) log.info({ steps: report.steps }, text);
  else log.error({ steps: report.steps, firstFailure: report.firstFailure }, text);
  return report;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}
