import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users, bytea } from './users';
import { meetings } from './meetings';
import { workspaces } from './workspaces';

/**
 * transcript_segments — one row per final speech-to-text line, written while
 * the meeting is still running.
 *
 * The whole-meeting `transcripts` row is still produced at the end and is still
 * the artifact the summary is built from. This table exists for two things that
 * row cannot do:
 *
 *   **Show a meeting as it happens.** Until now the transcript lived only in
 *   the worker's heap until the call ended, so a live view had nothing to
 *   render.
 *
 *   **Survive a crash.** A worker that died mid-meeting took the entire
 *   recording with it — no partial artifact, no recovery, and nothing to tell
 *   the user what was lost. That happened: nine good lines were destroyed by a
 *   container restart because they existed nowhere but memory.
 *
 * Text is encrypted per segment with the workspace DEK, exactly like the
 * whole-meeting blob. Live visibility must not become a reason to keep
 * plaintext at rest.
 */
export const transcriptSegments = pgTable(
  'transcript_segments',
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

    /**
     * Position within the meeting, starting at 0.
     *
     * Explicit rather than inferred from `createdAt`: two lines can be written
     * inside the same millisecond, and a reader paging by timestamp would then
     * either duplicate or skip one.
     */
    seq: integer('seq').notNull(),

    /** Milliseconds from the start of capture. Null when the provider omits them. */
    startMs: integer('start_ms'),
    endMs: integer('end_ms'),

    /** Diarised speaker label, when the provider supplies one. */
    speaker: text('speaker'),

    /** The line itself, encrypted with the workspace DEK. */
    textCt: bytea('text_ct').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // The read path: every segment for a meeting, in order.
    meetingSeqIdx: index('transcript_segments_meeting_seq_idx').on(table.meetingId, table.seq),
    // A retried write must not produce a second copy of the same line.
    meetingSeqUnique: uniqueIndex('transcript_segments_meeting_seq_unique').on(
      table.meetingId,
      table.seq,
    ),
    workspaceIdx: index('transcript_segments_workspace_idx').on(table.workspaceId),
  }),
);

export type TranscriptSegmentRow = typeof transcriptSegments.$inferSelect;
export type NewTranscriptSegmentRow = typeof transcriptSegments.$inferInsert;
