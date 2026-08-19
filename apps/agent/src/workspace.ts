import type { EnvelopeService } from '@hal/crypto';
import type { Repositories, UserRow, WorkspaceRow } from '@hal/db';

export async function requireWorkspaceForUser(
  repos: Repositories,
  envelope: EnvelopeService,
  user: UserRow,
): Promise<WorkspaceRow> {
  const existing = await repos.workspaces.findForUser(user.id);
  if (existing) return existing;
  const dek = await envelope.generateUserDek();
  return repos.workspaces.createPersonal({
    userId: user.id,
    name: user.name ?? user.email,
    dekWrapped: dek.wrappedDek,
    dekKmsKeyId: dek.keyId,
  });
}

export async function encryptJoinMeetingPayload(
  envelope: EnvelopeService,
  workspace: WorkspaceRow,
  meetingId: string,
): Promise<Uint8Array> {
  return envelope.encryptJson({
    wrappedDek: workspace.dekWrapped,
    keyId: workspace.dekKmsKeyId,
    value: { meetingId },
  });
}

export async function decryptJoinMeetingPayload(
  envelope: EnvelopeService,
  workspace: WorkspaceRow,
  ciphertext: Uint8Array,
): Promise<{ meetingId: string }> {
  return envelope.decryptJson<{ meetingId: string }>({
    wrappedDek: workspace.dekWrapped,
    keyId: workspace.dekKmsKeyId,
    ciphertext,
  });
}
