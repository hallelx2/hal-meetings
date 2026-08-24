import { and, asc, eq, gt, sql } from 'drizzle-orm';
import type { Db } from '../client';
import {
  transcriptSegments,
  type TranscriptSegmentRow,
  type NewTranscriptSegmentRow,
} from '../schema/transcript-segments';

export class TranscriptSegmentsRepository {
  constructor(private readonly db: Db) {}

  /**
   * Write one line.
   *
   * Idempotent on `(meetingId, seq)`. A write is retried whenever the network
   * blinks mid-meeting, and a duplicated line in a transcript is a quiet
   * corruption — it reads as somebody repeating themselves.
   */
  async append(input: NewTranscriptSegmentRow): Promise<TranscriptSegmentRow | null> {
    const [row] = await this.db
      .insert(transcriptSegments)
      .values(input)
      .onConflictDoNothing({
        target: [transcriptSegments.meetingId, transcriptSegments.seq],
      })
      .returning();
    return row ?? null;
  }

  /** Every segment for a meeting, oldest first. */
  async listForMeeting(meetingId: string, limit = 2_000): Promise<TranscriptSegmentRow[]> {
    return this.db
      .select()
      .from(transcriptSegments)
      .where(eq(transcriptSegments.meetingId, meetingId))
      .orderBy(asc(transcriptSegments.seq))
      .limit(limit);
  }

  /**
   * Segments after a sequence number — what a live view polls for.
   *
   * Keyed on `seq` rather than a timestamp so a caller can resume exactly where
   * it left off. Two lines can land in the same millisecond, and paging by time
   * would then either repeat one or drop one.
   */
  async listSince(
    meetingId: string,
    afterSeq: number,
    limit = 500,
  ): Promise<TranscriptSegmentRow[]> {
    return this.db
      .select()
      .from(transcriptSegments)
      .where(
        and(eq(transcriptSegments.meetingId, meetingId), gt(transcriptSegments.seq, afterSeq)),
      )
      .orderBy(asc(transcriptSegments.seq))
      .limit(limit);
  }

  /** How many lines exist so far. Cheap enough to poll. */
  async countForMeeting(meetingId: string): Promise<number> {
    const rows = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(transcriptSegments)
      .where(eq(transcriptSegments.meetingId, meetingId));
    return rows[0]?.count ?? 0;
  }
}
