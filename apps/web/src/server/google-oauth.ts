import type { EnvelopeService } from '@hal/crypto';
import type {
  AuditLogRepository,
  OauthTokensRepository,
  Repositories,
  UserRow,
  UsersRepository,
  WorkspaceRow,
  WorkspacesRepository,
} from '@hal/db';

import { IDENTITY_SCOPES } from '@/lib/google-scopes';

export {
  CALENDAR_SCOPES,
  GOOGLE_SCOPES,
  IDENTITY_SCOPES,
  hasCalendarAccess,
} from '@/lib/google-scopes';

export type GoogleOauthStore = {
  users: Pick<UsersRepository, 'findByEmail' | 'create'>;
  workspaces: Pick<WorkspacesRepository, 'findForUser' | 'createPersonal'>;
  oauthTokens: Pick<OauthTokensRepository, 'upsert' | 'deleteForUserProvider' | 'findForUser'>;
  auditLog: Pick<AuditLogRepository, 'record'>;
};

export type PersistGoogleOauthInput = {
  store: GoogleOauthStore;
  envelope: EnvelopeService;
  email: string;
  name: string | null;
  providerAccountId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scopes: string[];
};

export type PersistGoogleOauthResult = {
  user: UserRow;
  workspace: WorkspaceRow;
  createdUser: boolean;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function ciphertextContainsPlaintext(ciphertext: Uint8Array, plaintext: string): boolean {
  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(ciphertext).includes(plaintext);
  } catch {
    return false;
  }
}

export function auditDetailsLeakSecrets(details: Record<string, unknown>, secrets: string[]): boolean {
  const blob = JSON.stringify(details);
  return secrets.some((secret) => secret.length > 0 && blob.includes(secret));
}

export async function persistGoogleOauth(
  input: PersistGoogleOauthInput,
): Promise<PersistGoogleOauthResult> {
  const email = normalizeEmail(input.email);
  if (!email) throw new Error('Google account has no email');
  if (!input.accessToken) throw new Error('Google OAuth returned no access token');

  let createdUser = false;
  let user = await input.store.users.findByEmail(email);
  if (!user) {
    const dek = await input.envelope.generateUserDek();
    user = await input.store.users.create({
      email,
      name: input.name,
      dekWrapped: dek.wrappedDek,
      dekKmsKeyId: dek.keyId,
    });
    createdUser = true;
  }

  let workspace = await input.store.workspaces.findForUser(user.id);
  if (!workspace) {
    const dek = await input.envelope.generateUserDek();
    workspace = await input.store.workspaces.createPersonal({
      userId: user.id,
      name: user.name ?? email,
      dekWrapped: dek.wrappedDek,
      dekKmsKeyId: dek.keyId,
    });
  }

  const accessTokenCt = await input.envelope.encryptString({
    wrappedDek: user.dekWrapped,
    keyId: user.dekKmsKeyId,
    plaintext: input.accessToken,
  });
  if (ciphertextContainsPlaintext(accessTokenCt, input.accessToken)) {
    throw new Error('access token encrypt produced plaintext');
  }

  const refreshTokenCt = input.refreshToken
    ? await input.envelope.encryptString({
        wrappedDek: user.dekWrapped,
        keyId: user.dekKmsKeyId,
        plaintext: input.refreshToken,
      })
    : null;
  if (input.refreshToken && refreshTokenCt && ciphertextContainsPlaintext(refreshTokenCt, input.refreshToken)) {
    throw new Error('refresh token encrypt produced plaintext');
  }

  // Fall back to identity, never to the full grant. A provider response that
  // omits `scope` must not be recorded as carrying calendar access it may not
  // have — that would make hasCalendarAccess() lie, hide the connect prompt,
  // and leave the sync failing with no way for the user to fix it.
  const scopes = input.scopes.length > 0 ? input.scopes : [...IDENTITY_SCOPES];

  await input.store.oauthTokens.upsert({
    workspaceId: workspace.id,
    userId: user.id,
    provider: 'google',
    providerAccountId: input.providerAccountId,
    accessTokenCt,
    refreshTokenCt,
    expiresAt: input.expiresAt,
    scopes,
  });

  if (createdUser) {
    await input.store.auditLog.record({
      workspaceId: workspace.id,
      userId: user.id,
      action: 'user_created',
      actor: `user:${user.id}`,
      details: { email },
    });
  }

  const connectedDetails = {
    provider: 'google',
    providerAccountId: input.providerAccountId,
    scopes,
  };
  if (auditDetailsLeakSecrets(connectedDetails, [input.accessToken, input.refreshToken ?? ''])) {
    throw new Error('oauth_connected audit must not contain tokens');
  }

  await input.store.auditLog.record({
    workspaceId: workspace.id,
    userId: user.id,
    action: 'oauth_connected',
    actor: `user:${user.id}`,
    details: connectedDetails,
  });

  return { user, workspace, createdUser };
}

export async function disconnectGoogle(
  store: GoogleOauthStore,
  userId: string,
): Promise<void> {
  const workspace = await store.workspaces.findForUser(userId);
  await store.oauthTokens.deleteForUserProvider(userId, 'google');
  await store.auditLog.record({
    workspaceId: workspace?.id ?? null,
    userId,
    action: 'oauth_disconnected',
    actor: `user:${userId}`,
    details: { provider: 'google' },
  });
}

export function asGoogleOauthStore(repos: Repositories): GoogleOauthStore {
  return repos;
}
