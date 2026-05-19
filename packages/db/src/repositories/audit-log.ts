import { and, desc, eq } from 'drizzle-orm';
import type { Db } from '../client';
import {
  auditLog,
  type AuditLogRow,
  type NewAuditLogRow,
} from '../schema/audit-log';
import type { AuditAction } from '../types';

export class AuditLogRepository {
  constructor(private readonly db: Db) {}

  async record(input: NewAuditLogRow): Promise<AuditLogRow> {
    const [row] = await this.db.insert(auditLog).values(input).returning();
    if (!row) throw new Error('[@hal/db] audit log insert failed');
    return row;
  }

  async listForUser(userId: string, limit = 200): Promise<AuditLogRow[]> {
    return this.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.userId, userId))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);
  }

  async listForMeeting(meetingId: string): Promise<AuditLogRow[]> {
    return this.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.meetingId, meetingId))
      .orderBy(desc(auditLog.createdAt));
  }

  async listAction(action: AuditAction, limit = 200): Promise<AuditLogRow[]> {
    return this.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, action))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);
  }

  async listForUserAction(
    userId: string,
    action: AuditAction,
    limit = 200,
  ): Promise<AuditLogRow[]> {
    return this.db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.userId, userId), eq(auditLog.action, action)))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);
  }
}
