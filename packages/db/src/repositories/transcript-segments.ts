import { and, asc, eq, gt, inArray, sql } from 'drizzle-orm';
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

  /**
   * Line counts for many meetings at once.
   *
   * One query rather than one per meeting: the meetings list renders a count
   * beside every row, and doing that with `countForMeeting` in a loop is an
   * N+1 that gets slower exactly as someone uses the product more.
   */
  async countsForMeetings(meetingIds: string[]): Promise<Map<string, number>> {
    if (meetingIds.length === 0) return new Map();

    const rows = await this.db
      .select({
        meetingId: transcriptSegments.meetingId,
        count: sql<number>`count(*)::int`,
      })
      .from(transcriptSegments)
      .where(inArray(transcriptSegments.meetingId, meetingIds))
      .groupBy(transcriptSegments.meetingId);

    return new Map(rows.map((row) => [row.meetingId, row.count]));
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
