import { describe, expect, it } from 'bun:test';
import { LocalKms, createEnvelopeService } from '@hal/crypto';
import type { AuditLogRow, NewAuditLogRow, NewOauthTokenRow, OauthTokenRow, UserRow, WorkspaceRow } from '@hal/db';
import {
  auditDetailsLeakSecrets,
  ciphertextContainsPlaintext,
  disconnectGoogle,
  persistGoogleOauth,
  type GoogleOauthStore,
} from '../src/server/google-oauth';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function memoryStore(): GoogleOauthStore & {
  usersRows: UserRow[];
  workspacesRows: WorkspaceRow[];
  tokens: OauthTokenRow[];
  audits: AuditLogRow[];
} {
  const usersRows: UserRow[] = [];
  const workspacesRows: WorkspaceRow[] = [];
  const tokens: OauthTokenRow[] = [];
  const audits: AuditLogRow[] = [];

  return {
    usersRows,
    workspacesRows,
    tokens,
    audits,
    users: {
      async findByEmail(email) {
        return usersRows.find((u) => u.email === email) ?? null;
      },
      async create(input) {
        const row: UserRow = {
          id: crypto.randomUUID(),
          email: input.email,
          name: input.name ?? null,
          dekWrapped: input.dekWrapped,
          dekKmsKeyId: input.dekKmsKeyId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        usersRows.push(row);
        return row;
      },
    },
    workspaces: {
      async findForUser(userId) {
        return workspacesRows.find((w) => w.id === `ws-${userId}`) ?? workspacesRows[0] ?? null;
      },
      async createPersonal(input) {
        const row: WorkspaceRow = {
          id: `ws-${input.userId}`,
          name: input.name,
          plan: 'personal',
          featureFlags: {},
          dekWrapped: input.dekWrapped,
          dekKmsKeyId: input.dekKmsKeyId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        workspacesRows.push(row);
        return row;
      },
    },
    oauthTokens: {
      async findForUser(userId, provider) {
        return tokens.filter((t) => t.userId === userId && t.provider === provider);
      },
      async findByProviderAccount(userId, provider, providerAccountId) {
        return (
          tokens.find(
            (t) =>
              t.userId === userId &&
              t.provider === provider &&
              t.providerAccountId === providerAccountId,
          ) ?? null
        );
      },
      async upsert(input: NewOauthTokenRow) {
        const existing = tokens.findIndex(
          (t) =>
            t.userId === input.userId &&
            t.provider === input.provider &&
            t.providerAccountId === input.providerAccountId,
        );
        const row: OauthTokenRow = {
          id: existing >= 0 ? tokens[existing]!.id : crypto.randomUUID(),
          workspaceId: input.workspaceId,
          userId: input.userId,
          provider: input.provider,
          providerAccountId: input.providerAccountId,
          accessTokenCt: input.accessTokenCt,
          refreshTokenCt: input.refreshTokenCt ?? null,
          expiresAt: input.expiresAt ?? null,
          scopes: input.scopes ?? [],
          createdAt: existing >= 0 ? tokens[existing]!.createdAt : new Date(),
          updatedAt: new Date(),
        };
        if (existing >= 0) tokens[existing] = row;
        else tokens.push(row);
        return row;
      },
      async deleteForUserProvider(userId, provider) {
        for (let i = tokens.length - 1; i >= 0; i -= 1) {
          if (tokens[i]?.userId === userId && tokens[i]?.provider === provider) {
            tokens.splice(i, 1);
          }
        }
      },
    },
    auditLog: {
      async record(input: NewAuditLogRow) {
        const row: AuditLogRow = {
          id: crypto.randomUUID(),
          workspaceId: input.workspaceId ?? null,
          userId: input.userId ?? null,
          meetingId: input.meetingId ?? null,
          action: input.action,
          actor: input.actor,
          details: input.details ?? {},
          createdAt: new Date(),
        };
        audits.push(row);
        return row;
      },
    },
  };
}

describe('persistGoogleOauth', () => {
  it('stores ciphertext that is not the UTF-8 token and audits without secrets', async () => {
    const master = toHex(crypto.getRandomValues(new Uint8Array(32)));
    const envelope = createEnvelopeService(new LocalKms({ masterKeyHex: master }));
    const store = memoryStore();
    const accessToken = 'ya29.a0AfH6SMCplaintext-access';
    const refreshToken = '1//0gKplaintext-refresh';

    const result = await persistGoogleOauth({
      store,
      envelope,
      email: 'Founder@Hallelx2.com',
      name: 'Hal',
      providerAccountId: 'google-sub-1',
      accessToken,
      refreshToken,
      expiresAt: new Date('2026-08-20T00:00:00Z'),
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });

    expect(result.createdUser).toBe(true);
    expect(result.user.email).toBe('founder@hallelx2.com');
    expect(store.tokens).toHaveLength(1);
    const row = store.tokens[0]!;
    expect(ciphertextContainsPlaintext(row.accessTokenCt, accessToken)).toBe(false);
    expect(row.refreshTokenCt).not.toBeNull();
    expect(ciphertextContainsPlaintext(row.refreshTokenCt!, refreshToken)).toBe(false);

    const roundTrip = await envelope.decryptString({
      wrappedDek: result.user.dekWrapped,
      keyId: result.user.dekKmsKeyId,
      ciphertext: row.accessTokenCt,
    });
    expect(roundTrip).toBe(accessToken);

    const actions = store.audits.map((a) => a.action);
    expect(actions).toEqual(['user_created', 'oauth_connected']);
    for (const audit of store.audits) {
      expect(auditDetailsLeakSecrets(audit.details, [accessToken, refreshToken])).toBe(false);
    }
  });

  it('does not create a second user or workspace on reconnect', async () => {
    const master = toHex(crypto.getRandomValues(new Uint8Array(32)));
    const envelope = createEnvelopeService(new LocalKms({ masterKeyHex: master }));
    const store = memoryStore();
    const first = await persistGoogleOauth({
      store,
      envelope,
      email: 'a@example.com',
      name: 'A',
      providerAccountId: 'sub',
      accessToken: 'ya29.first',
      refreshToken: '1//first',
      expiresAt: null,
      scopes: [],
    });
    const second = await persistGoogleOauth({
      store,
      envelope,
      email: 'a@example.com',
      name: 'A',
      providerAccountId: 'sub',
      accessToken: 'ya29.second',
      refreshToken: '1//second',
      expiresAt: null,
      scopes: [],
    });
    expect(second.createdUser).toBe(false);
    expect(second.user.id).toBe(first.user.id);
    expect(store.usersRows).toHaveLength(1);
    expect(store.workspacesRows).toHaveLength(1);
    expect(store.tokens).toHaveLength(1);
    expect(store.audits.filter((a) => a.action === 'user_created')).toHaveLength(1);
    expect(store.audits.filter((a) => a.action === 'oauth_connected')).toHaveLength(2);
  });

  it('keeps the stored refresh token when the provider does not return one', async () => {
    // The production incident: sign-in stopped forcing consent (HAL-828), so
    // Google issues no refresh token on an ordinary sign-in. Writing that null
    // through destroyed the only credential that can renew calendar access,
    // and nothing short of a full reconsent brought it back.
    const master = toHex(crypto.getRandomValues(new Uint8Array(32)));
    const envelope = createEnvelopeService(new LocalKms({ masterKeyHex: master }));
    const store = memoryStore();

    await persistGoogleOauth({
      store,
      envelope,
      email: 'a@example.com',
      name: 'A',
      providerAccountId: 'sub',
      accessToken: 'ya29.first',
      refreshToken: '1//the-only-refresh-token',
      expiresAt: null,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });
    const stored = store.tokens[0]!.refreshTokenCt;
    expect(stored).not.toBeNull();

    // A later identity-only sign-in, exactly as Google sends it.
    await persistGoogleOauth({
      store,
      envelope,
      email: 'a@example.com',
      name: 'A',
      providerAccountId: 'sub',
      accessToken: 'ya29.second',
      refreshToken: null,
      expiresAt: null,
      scopes: ['openid'],
    });

    expect(store.tokens).toHaveLength(1);
    expect(store.tokens[0]!.refreshTokenCt).not.toBeNull();
    expect(store.tokens[0]!.refreshTokenCt).toEqual(stored);
    // And it must still decrypt to the original secret, not merely be non-null.
    await expect(
      envelope.decryptString({
        wrappedDek: store.usersRows[0]!.dekWrapped,
        keyId: store.usersRows[0]!.dekKmsKeyId,
        ciphertext: store.tokens[0]!.refreshTokenCt!,
      }),
    ).resolves.toBe('1//the-only-refresh-token');
  });

  it('replaces the refresh token when the provider does send a new one', async () => {
    const master = toHex(crypto.getRandomValues(new Uint8Array(32)));
    const envelope = createEnvelopeService(new LocalKms({ masterKeyHex: master }));
    const store = memoryStore();

    await persistGoogleOauth({
      store, envelope, email: 'a@example.com', name: 'A', providerAccountId: 'sub',
      accessToken: 'ya29.first', refreshToken: '1//old', expiresAt: null, scopes: [],
    });
    await persistGoogleOauth({
      store, envelope, email: 'a@example.com', name: 'A', providerAccountId: 'sub',
      accessToken: 'ya29.second', refreshToken: '1//new', expiresAt: null, scopes: [],
    });

    await expect(
      envelope.decryptString({
        wrappedDek: store.usersRows[0]!.dekWrapped,
        keyId: store.usersRows[0]!.dekKmsKeyId,
        ciphertext: store.tokens[0]!.refreshTokenCt!,
      }),
    ).resolves.toBe('1//new');
  });
});

describe('disconnectGoogle', () => {
  it('deletes the provider row and audits oauth_disconnected', async () => {
    const master = toHex(crypto.getRandomValues(new Uint8Array(32)));
    const envelope = createEnvelopeService(new LocalKms({ masterKeyHex: master }));
    const store = memoryStore();
    const { user } = await persistGoogleOauth({
      store,
      envelope,
      email: 'a@example.com',
      name: 'A',
      providerAccountId: 'sub',
      accessToken: 'ya29.x',
      refreshToken: '1//x',
      expiresAt: null,
      scopes: [],
    });
    await disconnectGoogle(store, user.id);
    expect(store.tokens).toHaveLength(0);
    expect(store.audits.at(-1)?.action).toBe('oauth_disconnected');
  });
});
