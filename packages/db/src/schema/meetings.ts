import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { workspaces } from './workspaces';

/**
 * meetings — one row per meeting Hal knows about. Populated either from a
 * calendar event (Phase 1+) or from a manually-pasted URL (Phase 0).
 */
export const meetings = pgTable(
  'meetings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    platform: text('platform').notNull(), // 'meet' | 'zoom' | 'teams'
    externalUrl: text('external_url'),
    externalEventId: text('external_event_id'), // calendar event id if any
    title: text('title'),

    scheduledStart: timestamp('scheduled_start', { withTimezone: true }),
    scheduledEnd: timestamp('scheduled_end', { withTimezone: true }),
    actualStart: timestamp('actual_start', { withTimezone: true }),
    actualEnd: timestamp('actual_end', { withTimezone: true }),

    // 'auto' | 'ask' | 'ignore'
    policy: text('policy').notNull().default('ask'),
    // 'listen' | 'chat' | 'speak' | 'skipped'
    mode: text('mode').notNull().default('listen'),
    // 'scheduled' | 'joining' | 'in-progress' | 'completed' | 'failed' | 'cancelled'
    status: text('status').notNull().default('scheduled'),

    failureReason: text('failure_reason'),

    // Free-form metadata: attendees, original calendar payload, etc.
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceScheduledIdx: index('meetings_workspace_scheduled_idx').on(
      table.workspaceId,
      table.scheduledStart,
    ),
    userScheduledIdx: index('meetings_user_scheduled_idx').on(table.userId, table.scheduledStart),
    statusIdx: index('meetings_status_idx').on(table.status),
    platformIdx: index('meetings_platform_idx').on(table.platform),
  }),
);

export type MeetingRow = typeof meetings.$inferSelect;
export type NewMeetingRow = typeof meetings.$inferInsert;
