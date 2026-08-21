import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import type { Db } from '../client';
import { meetings, type MeetingRow, type NewMeetingRow } from '../schema/meetings';
import type { MeetingPolicy, MeetingStatus, MeetingMode, Platform } from '../types';

export interface MeetingWindowQuery {
  userId: string;
  from: Date;
  to: Date;
}

export class MeetingsRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<MeetingRow | null> {
    const rows = await this.db.select().from(meetings).where(eq(meetings.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async listUpcomingForUser(userId: string, limit = 20): Promise<MeetingRow[]> {
    return this.db
      .select()
      .from(meetings)
      .where(and(eq(meetings.userId, userId), sql`${meetings.scheduledStart} >= NOW()`))
      .orderBy(asc(meetings.scheduledStart))
      .limit(limit);
  }

  async listRecentForUser(userId: string, limit = 20): Promise<MeetingRow[]> {
    return this.db
      .select()
      .from(meetings)
      .where(eq(meetings.userId, userId))
      .orderBy(desc(meetings.scheduledStart))
      .limit(limit);
  }

  async listInWindow(q: MeetingWindowQuery): Promise<MeetingRow[]> {
    return this.db
      .select()
      .from(meetings)
      .where(
        and(
          eq(meetings.userId, q.userId),
          gte(meetings.scheduledStart, q.from),
          lte(meetings.scheduledStart, q.to),
        ),
      )
      .orderBy(asc(meetings.scheduledStart));
  }

  async create(input: NewMeetingRow): Promise<MeetingRow> {
    const [row] = await this.db.insert(meetings).values(input).returning();
    if (!row) throw new Error('[@hal/db] failed to insert meeting');
    return row;
  }

  /**
   * Refresh the parts of a meeting the calendar owns.
   *
   * Deliberately narrow: title, URL and times only. A calendar sync must never
   * touch `policy`, `mode` or `status` — those are the user's choice and the
   * agent's state, and a re-sync that reset them would silently undo a decision
   * or lose a meeting already in progress.
   */
  async updateSchedule(
    id: string,
    patch: Partial<{
      title: string | null;
      externalUrl: string | null;
      scheduledStart: Date | null;
      scheduledEnd: Date | null;
    }>,
  ): Promise<MeetingRow> {
    const [row] = await this.db
      .update(meetings)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(meetings.id, id))
      .returning();
    if (!row) throw new Error(`[@hal/db] meeting ${id} not found`);
    return row;
  }

  async updatePolicy(id: string, policy: MeetingPolicy, mode?: MeetingMode): Promise<MeetingRow> {
    const set: Partial<MeetingRow> = { policy, updatedAt: new Date() };
    if (mode) set.mode = mode;
    const [row] = await this.db.update(meetings).set(set).where(eq(meetings.id, id)).returning();
    if (!row) throw new Error(`[@hal/db] meeting ${id} not found`);
    return row;
  }

  async updateStatus(
    id: string,
    status: MeetingStatus,
    patch: Partial<{
      actualStart: Date;
      actualEnd: Date;
      failureReason: string;
    }> = {},
  ): Promise<MeetingRow> {
    const [row] = await this.db
      .update(meetings)
      .set({ status, ...patch, updatedAt: new Date() })
      .where(eq(meetings.id, id))
      .returning();
    if (!row) throw new Error(`[@hal/db] meeting ${id} not found`);
    return row;
  }

  async findByExternalEvent(
    userId: string,
    platform: Platform,
    externalEventId: string,
  ): Promise<MeetingRow | null> {
    const rows = await this.db
      .select()
      .from(meetings)
      .where(
        and(
          eq(meetings.userId, userId),
          eq(meetings.platform, platform),
          eq(meetings.externalEventId, externalEventId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }
}
