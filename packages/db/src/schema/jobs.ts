import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { users, bytea } from './users';
import { workspaces } from './workspaces';

/**
 * jobs — Postgres-backed work queue. Pre-M5 simple-poll implementation; can
 * be migrated to Temporal at M6 without changing the call sites.
 *
 * Payload is encrypted (it may contain meeting URLs, persona briefs, etc.).
 */
export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),

    kind: text('kind').notNull(), // see JOB_KINDS
    status: text('status').notNull().default('pending'), // see JOB_STATUSES

    payloadCt: bytea('payload_ct').notNull(),
    resultCt: bytea('result_ct'),
    errorMessage: text('error_message'),

    priority: integer('priority').notNull().default(0),
    retryCount: integer('retry_count').notNull().default(0),
    maxRetries: integer('max_retries').notNull().default(3),

    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull().defaultNow(),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    claimedBy: text('claimed_by'), // worker hostname:pid
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusScheduledIdx: index('jobs_status_scheduled_idx').on(table.status, table.scheduledFor),
    userKindIdx: index('jobs_user_kind_idx').on(table.userId, table.kind),
    kindIdx: index('jobs_kind_idx').on(table.kind),
  }),
);

export type JobRow = typeof jobs.$inferSelect;
export type NewJobRow = typeof jobs.$inferInsert;
