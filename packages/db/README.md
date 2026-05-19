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

## Use

```ts
import { createDb, makeRepositories } from '@hal/db';

const { db, close, ping } = createDb({ url: process.env.DATABASE_URL });
await ping();

const repos = makeRepositories(db);
const user = await repos.users.findByEmail('halleluyah@example.com');
```

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
