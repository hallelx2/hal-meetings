import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { meetings } from './meetings';
import { workspaces } from './workspaces';

/**
 * audit_log — append-only record of every meaningful action Hal takes.
 *
 * This is the user-facing "Hal said this, Hal did that" timeline. Every bot
 * utterance, every token decryption, every KMS unwrap is logged here.
 *
 * `details` is plaintext JSON — DO NOT put secrets here. Reference encrypted
 * payloads by their row id instead.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    meetingId: uuid('meeting_id').references(() => meetings.id, { onDelete: 'set null' }),

    action: text('action').notNull(), // see AUDIT_ACTIONS
    actor: text('actor').notNull(), // 'system' | 'bot' | 'user:<id>'

    details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userCreatedIdx: index('audit_log_user_created_idx').on(table.userId, table.createdAt),
    meetingCreatedIdx: index('audit_log_meeting_created_idx').on(table.meetingId, table.createdAt),
    actionIdx: index('audit_log_action_idx').on(table.action),
  }),
);

export type AuditLogRow = typeof auditLog.$inferSelect;
export type NewAuditLogRow = typeof auditLog.$inferInsert;
