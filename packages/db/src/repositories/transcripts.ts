import { and, desc, eq } from 'drizzle-orm';
import type { Db } from '../client';
import {
  transcripts,
  type TranscriptRow,
  type NewTranscriptRow,
} from '../schema/transcripts';

export class TranscriptsRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<TranscriptRow | null> {
    const rows = await this.db
      .select()
      .from(transcripts)
      .where(eq(transcripts.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async findForMeeting(meetingId: string): Promise<TranscriptRow | null> {
    const rows = await this.db
      .select()
      .from(transcripts)
      .where(eq(transcripts.meetingId, meetingId))
      .orderBy(desc(transcripts.createdAt))
      .limit(1);
    return rows[0] ?? null;
  }

  async listForUser(userId: string, limit = 20): Promise<TranscriptRow[]> {
    return this.db
      .select()
      .from(transcripts)
      .where(eq(transcripts.userId, userId))
      .orderBy(desc(transcripts.createdAt))
      .limit(limit);
  }

  async create(input: NewTranscriptRow): Promise<TranscriptRow> {
    const [row] = await this.db.insert(transcripts).values(input).returning();
    if (!row) throw new Error('[@hal/db] failed to insert transcript');
    return row;
  }

  async setSummary(
    id: string,
    summaryCt: Uint8Array,
    actionItemsCt?: Uint8Array,
  ): Promise<TranscriptRow> {
    const [row] = await this.db
      .update(transcripts)
      .set({ summaryCt, ...(actionItemsCt ? { actionItemsCt } : {}) })
      .where(eq(transcripts.id, id))
      .returning();
    if (!row) throw new Error(`[@hal/db] transcript ${id} not found`);
    return row;
  }

  async deleteByMeeting(userId: string, meetingId: string): Promise<void> {
    await this.db
      .delete(transcripts)
      .where(and(eq(transcripts.userId, userId), eq(transcripts.meetingId, meetingId)));
  }
}
