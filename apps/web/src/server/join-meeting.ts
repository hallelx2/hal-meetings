import type { EnvelopeService } from '@hal/crypto';
import type {
  JobsRepository,
  MeetingsRepository,
  UserRow,
  UsersRepository,
  WorkspaceRow,
  WorkspacesRepository,
} from '@hal/db';

const MEET_HOST = /(^|\.)meet\.google\.com$/i;
const MEET_CODE = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/i;

export type JoinStore = {
  users: Pick<UsersRepository, 'findByEmail'>;
  workspaces: Pick<WorkspacesRepository, 'findForUser' | 'createPersonal'>;
  meetings: Pick<MeetingsRepository, 'create'>;
  jobs: Pick<JobsRepository, 'enqueue'>;
};

export function parseMeetUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (!MEET_HOST.test(url.hostname)) return null;
  const code = url.pathname.replace(/^\//, '').split('/')[0] ?? '';
  if (!MEET_CODE.test(code)) return null;
  return `https://meet.google.com/${code.toLowerCase()}`;
}

export async function enqueueJoinMeeting(input: {
  store: JoinStore;
  envelope: EnvelopeService;
  user: UserRow;
  url: string;
}): Promise<{ meetingId: string; jobId: string }> {
  const url = parseMeetUrl(input.url);
  if (!url) throw new Error('invalid_meet_url');

  let workspace: WorkspaceRow | null = await input.store.workspaces.findForUser(input.user.id);
  if (!workspace) {
    const dek = await input.envelope.generateUserDek();
    workspace = await input.store.workspaces.createPersonal({
      userId: input.user.id,
      name: input.user.name ?? input.user.email,
      dekWrapped: dek.wrappedDek,
      dekKmsKeyId: dek.keyId,
    });
  }

  const meeting = await input.store.meetings.create({
    workspaceId: workspace.id,
    userId: input.user.id,
    platform: 'meet',
    externalUrl: url,
    title: 'Pasted Meet',
    policy: 'auto',
    mode: 'listen',
    status: 'scheduled',
    scheduledStart: new Date(),
  });

  const payloadCt = await input.envelope.encryptJson({
    wrappedDek: workspace.dekWrapped,
    keyId: workspace.dekKmsKeyId,
    value: { meetingId: meeting.id },
  });

  const job = await input.store.jobs.enqueue({
    workspaceId: workspace.id,
    userId: input.user.id,
    kind: 'join_meeting',
    status: 'pending',
    payloadCt,
  });

  return { meetingId: meeting.id, jobId: job.id };
}
