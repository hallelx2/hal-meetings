import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

export type Db = PostgresJsDatabase<typeof schema>;

export interface CreateDbOptions {
  /** Postgres connection string. Falls back to DATABASE_URL env var. */
  url?: string;
  /** Max pool size. Default 10. */
  max?: number;
  /** Idle timeout in seconds. Default 30. */
  idleTimeout?: number;
  /** Connection timeout in seconds. Default 10. */
  connectTimeout?: number;
  /** Enable Drizzle query logging. Default false. */
  log?: boolean;
}

export interface DbHandle {
  db: Db;
  /** Close the underlying postgres-js pool. Idempotent. */
  close(): Promise<void>;
  /** Run a one-shot probe query. Throws on unreachable DB. */
  ping(): Promise<void>;
}

/**
 * Create a Drizzle DB handle. Caller owns the lifecycle — call `.close()`
 * on shutdown. Tables are exported via the returned `db.schema` accessor on
 * the schema namespace import.
 */
export function createDb(opts: CreateDbOptions = {}): DbHandle {
  const url = opts.url ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      '[@hal/db] DATABASE_URL not set and no `url` passed to createDb(). ' +
        'Set DATABASE_URL=postgres://user:pass@host:5432/dbname.',
    );
  }

  const sql = postgres(url, {
    max: opts.max ?? 10,
    idle_timeout: opts.idleTimeout ?? 30,
    connect_timeout: opts.connectTimeout ?? 10,
    onnotice: () => {
      // Suppress NOTICE-level messages from being logged.
    },
  });

  const db = drizzle(sql, { schema, logger: opts.log ?? false });

  return {
    db,
    async close() {
      await sql.end({ timeout: 5 });
    },
    async ping() {
      await sql`SELECT 1`;
    },
  };
}
