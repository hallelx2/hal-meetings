import type { JobRow, Repositories } from '@hal/db';
import type { EnvelopeService, Kms } from '@hal/crypto';
import type { SttProvider, LlmProvider } from '@hal/media';
import type { BotRuntime } from '../runtime/types';
import type { AudioCapture } from '../audio/types';
import type { EmailSender } from '../email/resend';
import type { Logger } from '../logger';
import { runMeetingSession } from '../pipeline/meeting-session';
import { decryptJoinMeetingPayload } from '../workspace';

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
  resolveRuntime: (platform: 'meet' | 'zoom' | 'teams') => { runtime: BotRuntime; audio: AudioCapture };
  botDisplayName: string;
  botDisclosure: string;
}

export function makeJoinMeetingHandler(ctx: HandlerContext) {
  return async function joinMeetingHandler(job: JobRow): Promise<void> {
    if (!job.workspaceId) {
      throw new Error(`job ${job.id} has no workspace_id`);
    }
    const workspace = await ctx.repos.workspaces.findById(job.workspaceId);
    if (!workspace) {
      throw new Error(`workspace not found: ${job.workspaceId}`);
    }

    const payload = await decryptJoinMeetingPayload(ctx.envelope, workspace, job.payloadCt);

    const meeting = await ctx.repos.meetings.findById(payload.meetingId);
    if (!meeting) {
      throw new Error(`meeting not found: ${payload.meetingId}`);
    }
    if (meeting.workspaceId !== workspace.id) {
      throw new Error(`meeting ${meeting.id} is not in workspace ${workspace.id}`);
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
        workspaceId: workspace.id,
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
