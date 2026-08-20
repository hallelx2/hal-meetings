import { describe, expect, test } from 'bun:test';
import { getAuthTables } from '@better-auth/core/db';
import { getTableColumns } from 'drizzle-orm';
import {
  authAccount,
  authSession,
  authUser,
  authVerification,
} from '../src/schema/auth';

/**
 * The auth_* tables are Better Auth's, not ours. Their required shape comes
 * from the installed better-auth version, so a version bump can add a field
 * we do not have.
 *
 * When that happens the Drizzle adapter resolves the missing field to
 * `undefined` and emits SQL with an empty left-hand side —
 * `where ( = $1 and "auth_account"."account_id" = $2)` — which Postgres
 * rejects as a syntax error. Better Auth catches it and reports only
 * "unable to query your database", so the actual cause is invisible.
 *
 * That is how 1.3 -> 1.7 silently broke every sign-in by adding
 * `account.issuer`. This test fails at build time instead.
 */
describe('auth schema matches the installed better-auth', () => {
  const tables = getAuthTables({});

  const ours = {
    user: authUser,
    session: authSession,
    account: authAccount,
    verification: authVerification,
  } as const;

  for (const model of Object.keys(ours) as (keyof typeof ours)[]) {
    test(`${model} defines every field better-auth declares`, () => {
      const declared = tables[model];
      expect(declared).toBeDefined();

      const expected = Object.keys(declared!.fields).sort();
      const actual = Object.keys(getTableColumns(ours[model]));
      const missing = expected.filter((field) => !actual.includes(field));

      expect(missing).toEqual([]);
    });
  }

  test('account carries the issuer better-auth keys identities on', () => {
    // Guards the specific regression: the (issuer, accountId) lookup that
    // every OAuth callback performs.
    expect(Object.keys(getTableColumns(authAccount))).toContain('issuer');
  });
});
