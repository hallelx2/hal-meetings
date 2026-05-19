import type { JobRow, Repositories } from '@hal/db';
import type { EnvelopeService, Kms } from '@hal/crypto';
import type { SttProvider, LlmProvider } from '@hal/media';
import type { BotRuntime } from '../runtime/types';
import type { AudioCapture } from '../audio/types';
import type { EmailSender } from '../email/resend';
import type { Logger } from '../logger';
import { runMeetingSession } from '../pipeline/meeting-session';

export interface JoinMeetingPayload {
  meetingId: string;
}

export interface HandlerContext {
  repos: Repositories;
  envelope: EnvelopeService;
  kms: Kms;
  stt: SttProvider;
  llm: LlmProvider;
  email?: EmailSender;
  fromEmail: string;
  log: Logger;
  /** Factory: given a platform, return the runtime + audio. Lets handlers stay platform-agnostic. */
  resolveRuntime: (platform: 'meet' | 'zoom' | 'teams') => { runtime: BotRuntime; audio: AudioCapture };
  /** Bot identity templates. */
  botDisplayName: string; // can contain {{user}}
  botDisclosure: string; // can contain {{user}}
}

/**
 * Handler for `join_meeting` jobs. Decrypts the meeting payload, resolves
 * the user's DEK + email, picks a runtime, and runs the full session.
 */
export function makeJoinMeetingHandler(ctx: HandlerContext) {
  return async function joinMeetingHandler(job: JobRow): Promise<void> {
    const payload = await ctx.envelope.decryptJson<JoinMeetingPayload>({
      wrappedDek: await getServiceDek(ctx),
      keyId: await getServiceKeyId(ctx),
      ciphertext: job.payloadCt,
    });

    const meeting = await ctx.repos.meetings.findById(payload.meetingId);
    if (!meeting) {
      throw new Error(`meeting not found: ${payload.meetingId}`);
    }
    if (!meeting.externalUrl) {
      throw new Error(`meeting ${meeting.id} has no externalUrl`);
    }

    const user = await ctx.repos.users.findById(meeting.userId);
    if (!user) {
      throw new Error(`user not found: ${meeting.userId}`);
    }

    const platform = meeting.platform as 'meet' | 'zoom' | 'teams';
    const { runtime, audio } = ctx.resolveRuntime(platform);

    const userName = user.name ?? user.email.split('@')[0]!;
    const botDisplayName = ctx.botDisplayName.replace('{{user}}', userName);
    const disclosure = ctx.botDisclosure.replace('{{user}}', userName);

    await runMeetingSession(
      {
        runtime,
        audio,
        stt: ctx.stt,
        llm: ctx.llm,
        envelope: ctx.envelope,
        repos: ctx.repos,
        email: ctx.email,
        fromEmail: ctx.fromEmail,
        log: ctx.log,
      },
      {
        userId: user.id,
        userEmail: user.email,
        userDisplayName: userName,
        userWrappedDek: user.dekWrapped,
        userKeyId: user.dekKmsKeyId,
        meetingId: meeting.id,
        meetingUrl: meeting.externalUrl,
        meetingTitle: meeting.title ?? undefined,
        mode: meeting.mode as 'listen' | 'chat' | 'speak',
        disclosure,
        botDisplayName,
      },
    );
  };
}

/**
 * Job payloads are encrypted with the service-level DEK (not per-user) so
 * the consumer can decrypt them without knowing the user yet. In a real
 * deployment, this is a fixed system user. For Phase 0 we accept that the
 * job payload contains only the meeting id — a reference, not the data —
 * so its sensitivity is low.
 */
async function getServiceDek(ctx: HandlerContext): Promise<Uint8Array> {
  // We can use the "system" user's DEK or a service-fixed one. For now,
  // generate a stable per-process service DEK by deriving from a constant.
  // (Acceptable for Phase 0 since payloads carry only reference ids.)
  // Production should store a dedicated service user with its own DEK.
  if (!cachedServiceDek) {
    cachedServiceDek = await ctx.envelope.generateUserDek();
  }
  return cachedServiceDek.wrappedDek;
}
async function getServiceKeyId(ctx: HandlerContext): Promise<string> {
  if (!cachedServiceDek) {
    cachedServiceDek = await ctx.envelope.generateUserDek();
  }
  return cachedServiceDek.keyId;
}

let cachedServiceDek: { wrappedDek: Uint8Array; keyId: string } | null = null;
