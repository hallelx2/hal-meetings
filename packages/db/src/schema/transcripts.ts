import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { users, bytea } from './users';
import { meetings } from './meetings';
import { workspaces } from './workspaces';

/**
 * transcripts — encrypted blob per meeting. Content is markdown ciphertext;
 * summary is a structured markdown doc encrypted separately so we can show a
 * preview email without unwrapping the full transcript.
 */
export const transcripts = pgTable(
  'transcripts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    meetingId: uuid('meeting_id')
      .notNull()
      .references(() => meetings.id, { onDelete: 'cascade' }),

    contentCt: bytea('content_ct').notNull(),
    summaryCt: bytea('summary_ct'),

    // Diarization stats and STT metadata. Kept plain for analytics.
    durationSeconds: text('duration_seconds'),
    speakerCount: text('speaker_count'),
    sttProvider: text('stt_provider'),
    llmProvider: text('llm_provider'),

    // Action items, decisions, open questions — structured but encrypted.
    actionItemsCt: bytea('action_items_ct'),

    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    meetingIdx: index('transcripts_meeting_idx').on(table.meetingId),
    userCreatedIdx: index('transcripts_user_created_idx').on(table.userId, table.createdAt),
    workspaceCreatedIdx: index('transcripts_workspace_created_idx').on(
      table.workspaceId,
      table.createdAt,
    ),
  }),
);

export type TranscriptRow = typeof transcripts.$inferSelect;
export type NewTranscriptRow = typeof transcripts.$inferInsert;
