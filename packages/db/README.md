# @hal/db

Database layer for Hal — Drizzle ORM schema, typed repositories, Postgres client.

## Tables

| Table | Purpose | Encrypted columns |
|---|---|---|
| `users` | Account root. Owns the per-user DEK. | `dek_wrapped` |
| `oauth_tokens` | Encrypted access + refresh tokens per provider per user. | `access_token_ct`, `refresh_token_ct` |
| `meetings` | One row per known meeting. | (none — metadata only) |
| `transcripts` | Encrypted transcript + summary + action items. | `content_ct`, `summary_ct`, `action_items_ct` |
| `jobs` | Postgres-backed work queue with retry + back-off. | `payload_ct`, `result_ct` |
| `audit_log` | Append-only timeline of Hal's actions. | (none — references encrypted rows by id) |

The `auth_*` tables are owned by Better Auth, not by us. Their shape is dictated by the installed `better-auth` version, so **`better-auth` is pinned to a patch range** in `apps/web/package.json`. A minor bump can add a required column, and the failure mode is ugly: the Drizzle adapter resolves the unknown field to `undefined`, emits `where ( = $1 …)`, and Postgres rejects it as a syntax error that Better Auth reports only as "unable to query your database". That is exactly how 1.3 → 1.7 broke every sign-in by adding `account.issuer`. Bump the range deliberately, and diff `getAuthTables()` against `src/schema/auth.ts` when you do.

## Use

```ts
import { createDb, makeRepositories } from '@hal/db';

const { db, close, ping } = createDb({ url: process.env.DATABASE_URL });
await ping();

const repos = makeRepositories(db);
const user = await repos.users.findByEmail('halleluyah@example.com');
```

## Seeing the SQL

Set `DB_LOG_QUERIES=1` (or pass `createDb({ log: true })`) to log every statement Drizzle emits, with its bound parameters.

Reach for this when a caller reports a database error without the query. Better Auth is the usual case: it reports adapter failures as *"Better auth was unable to query your database"* and drops the statement, so a Postgres syntax error arrives with no way to tell which of its queries produced it. With this on, the SQL appears in the platform log immediately before the error.

Parameters are logged, so treat the output as sensitive and turn it off again once you have what you need.

## Migrations

```bash
# generate from schema
bun run db:generate

# apply to the database in DATABASE_URL
bun run db:migrate

# dev-only: push schema directly without a migration file
bun run db:push
```

## Guarantees

- Every secret-bearing column is `BYTEA` — the DB layer never sees plaintext.
- Every table that holds user data is foreign-keyed to `users(id)` with `ON DELETE CASCADE`. Hard-deleting a user takes their data with them.
- Jobs use `FOR UPDATE SKIP LOCKED` so multiple workers don't double-claim.
- Audit log is append-only by convention. Plaintext `details` JSONB must never carry secrets.
