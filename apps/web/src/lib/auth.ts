import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { eq } from 'drizzle-orm';
import {
  authAccount,
  authSession,
  authUser,
  authVerification,
} from '@hal/db/schema';
import { IDENTITY_SCOPES, persistGoogleOauth, resolveGrantedScopes } from '@/server/google-oauth';
import { getDbHandle, getEnvelope, getRepos } from '@/server/hal';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function createAuth() {
  const db = getDbHandle().db;

  return betterAuth({
    appName: 'Hal',
    trustedOrigins: ['http://localhost:3000', 'https://hal.hallelx2.com'],
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: authUser,
        session: authSession,
        account: authAccount,
        verification: authVerification,
      },
    }),
    socialProviders: {
      google: {
        clientId: requireEnv('GOOGLE_CLIENT_ID'),
        clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
        // Sign-in establishes identity only. Calendar is requested later, by
        // ConnectCalendarButton, which overrides these scopes per request.
        scope: [...IDENTITY_SCOPES],
        accessType: 'offline',
        // No forced `consent` here — that belongs to the calendar step, which
        // genuinely needs a refresh token. Forcing it on every sign-in just
        // makes returning users re-approve something they already approved.
        prompt: 'select_account',
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ['google'],
      },
    },
    databaseHooks: {
      account: {
        create: {
          after: async (account) => {
            try {
              await persistAccountTokens(db, account);
            } catch (error) {
              console.error('persist google tokens failed', error);
            }
          },
        },
        update: {
          after: async (account) => {
            try {
              await persistAccountTokens(db, account);
            } catch (error) {
              console.error('persist google tokens failed', error);
            }
          },
        },
      },
    },
    plugins: [nextCookies()],
  });
}

type AuthAccountRow = {
  id: string;
  userId: string;
  accountId: string;
  providerId: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  accessTokenExpiresAt?: Date | null;
  scope?: string | null;
};

async function persistAccountTokens(
  db: ReturnType<typeof getDbHandle>['db'],
  account: AuthAccountRow,
): Promise<void> {
  if (account.providerId !== 'google') return;
  if (!account.accessToken) return;

  const [baUser] = await db.select().from(authUser).where(eq(authUser.id, account.userId)).limit(1);
  if (!baUser?.email) {
    throw new Error('Better Auth user missing email after Google callback');
  }

  await persistGoogleOauth({
    store: getRepos(),
    envelope: getEnvelope(),
    email: baUser.email,
    name: baUser.name,
    providerAccountId: account.accountId,
    accessToken: account.accessToken,
    refreshToken: account.refreshToken ?? null,
    expiresAt: account.accessTokenExpiresAt ?? null,
    scopes: resolveGrantedScopes(account.scope),
  });

  await db
    .update(authAccount)
    .set({
      accessToken: null,
      refreshToken: null,
      idToken: null,
      updatedAt: new Date(),
    })
    .where(eq(authAccount.id, account.id));
}

let authSingleton: ReturnType<typeof createAuth> | null = null;

export function getAuth() {
  if (!authSingleton) authSingleton = createAuth();
  return authSingleton;
}
