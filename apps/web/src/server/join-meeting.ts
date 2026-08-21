import type { EnvelopeService } from '@hal/crypto';
import { parseJoinableUrl } from '@hal/meeting-links';
import type {
  JobsRepository,
  MeetingsRepository,
  UserRow,
  UsersRepository,
  WorkspaceRow,
  WorkspacesRepository,
} from '@hal/db';


export type JoinStore = {
  users: Pick<UsersRepository, 'findByEmail'>;
  workspaces: Pick<WorkspacesRepository, 'findForUser' | 'createPersonal'>;
  meetings: Pick<MeetingsRepository, 'create'>;
  jobs: Pick<JobsRepository, 'enqueue'>;
};

/**
 * Kept as a named export because the API route and its tests speak in terms of
 * "is this a link Hal can join". It now covers Zoom as well as Meet, so the
 * name is the only Meet-specific thing left about it.
 *
 * @deprecated prefer `parseJoinableUrl` from `@hal/meeting-links`.
 */
export function parseMeetUrl(raw: string): string | null {
  return parseJoinableUrl(raw)?.url ?? null;
}

export async function enqueueJoinMeeting(input: {
  store: JoinStore;
  envelope: EnvelopeService;
  user: UserRow;
  url: string;
}): Promise<{ meetingId: string; jobId: string }> {
  const link = parseJoinableUrl(input.url);
  if (!link) throw new Error('invalid_meet_url');
  const url = link.url;

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
    platform: link.platform,
    externalUrl: url,
    title: link.platform === 'zoom' ? 'Pasted Zoom' : 'Pasted Meet',
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
