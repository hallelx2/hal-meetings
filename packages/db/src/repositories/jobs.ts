import { and, eq, inArray, lt, sql } from 'drizzle-orm';
import type { Db } from '../client';
import { jobs, type JobRow, type NewJobRow } from '../schema/jobs';
import type { JobKind, JobStatus } from '../types';

export interface ClaimOptions {
  /** Worker identity for the `claimed_by` field. Default: hostname:pid. */
  workerId: string;
  /** Only claim jobs whose kind matches one of these. */
  kinds?: JobKind[];
  /** Max jobs to claim in one call. Default 1. */
  limit?: number;
}

export class JobsRepository {
  constructor(private readonly db: Db) {}

  async enqueue(input: NewJobRow): Promise<JobRow> {
    const [row] = await this.db.insert(jobs).values(input).returning();
    if (!row) throw new Error('[@hal/db] failed to enqueue job');
    return row;
  }

  async findById(id: string): Promise<JobRow | null> {
    const rows = await this.db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
    return rows[0] ?? null;
  }

  /**
   * Claim pending jobs atomically using SKIP LOCKED. Returns the rows that
   * are now owned by this worker — the caller must finish or release them.
   */
  async claim(opts: ClaimOptions): Promise<JobRow[]> {
    const limit = opts.limit ?? 1;
    const kindList = opts.kinds && opts.kinds.length > 0 ? opts.kinds : null;
    const kindFilter = kindList
      ? sql`AND ${jobs.kind} IN (${sql.join(
          kindList.map((kind) => sql`${kind}`),
          sql`, `,
        )})`
      : sql``;

    // Drizzle 0.36 supports raw SQL for complex CTEs. We use FOR UPDATE SKIP
    // LOCKED to avoid two workers grabbing the same job.
    // IN (...), not ANY($1): postgres-js binds a JS string[] as text, and
    // ANY(text) is a malformed array literal.
    //
    // `RETURNING id`, not `RETURNING *`. Raw SQL comes back from the driver
    // with the database's own column names — `workspace_id`, `payload_ct` —
    // and casting that to JobRow does not rename anything. It only silences
    // the compiler. Every camelCase field the caller then reads is `undefined`,
    // which surfaced as "job <id> has no workspace_id" on a row whose
    // workspace_id was populated all along.
    const claimed = await this.db.execute<{ id: string }>(sql`
      WITH claimed AS (
        SELECT id
        FROM ${jobs}
        WHERE ${jobs.status} = 'pending'
          AND ${jobs.scheduledFor} <= NOW()
          ${kindFilter}
        ORDER BY ${jobs.priority} DESC, ${jobs.scheduledFor} ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE ${jobs}
      SET status = 'claimed',
          claimed_at = NOW(),
          claimed_by = ${opts.workerId},
          updated_at = NOW()
      WHERE id IN (SELECT id FROM claimed)
      RETURNING id;
    `);

    const ids = (claimed as unknown as Array<{ id: string }>).map((row) => row.id);
    if (ids.length === 0) return [];

    // The rows are already claimed by the UPDATE above, so re-selecting them
    // through Drizzle costs one query and buys the correct field mapping.
    return this.db.select().from(jobs).where(inArray(jobs.id, ids));
  }

  async markStarted(id: string): Promise<JobRow> {
    const [row] = await this.db
      .update(jobs)
      .set({ status: 'running', startedAt: new Date(), updatedAt: new Date() })
      .where(eq(jobs.id, id))
      .returning();
    if (!row) throw new Error(`[@hal/db] job ${id} not found`);
    return row;
  }

  async markCompleted(id: string, resultCt?: Uint8Array): Promise<JobRow> {
    const [row] = await this.db
      .update(jobs)
      .set({
        status: 'completed',
        finishedAt: new Date(),
        updatedAt: new Date(),
        ...(resultCt ? { resultCt } : {}),
      })
      .where(eq(jobs.id, id))
      .returning();
    if (!row) throw new Error(`[@hal/db] job ${id} not found`);
    return row;
  }

  /**
   * Mark a job as failed. If retryCount < maxRetries, the job is re-queued
   * with exponential back-off; otherwise it stays failed.
   */
  async markFailed(id: string, errorMessage: string): Promise<JobRow> {
    const job = await this.findById(id);
    if (!job) throw new Error(`[@hal/db] job ${id} not found`);

    const nextRetry = job.retryCount + 1;
    if (nextRetry > job.maxRetries) {
      const [row] = await this.db
        .update(jobs)
        .set({
          status: 'failed',
          errorMessage,
          finishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, id))
        .returning();
      if (!row) throw new Error(`[@hal/db] job ${id} not found`);
      return row;
    }

    const backoffMs = Math.min(1000 * 2 ** nextRetry, 60_000 * 5); // capped at 5 min
    const scheduledFor = new Date(Date.now() + backoffMs);

    const [row] = await this.db
      .update(jobs)
      .set({
        status: 'pending',
        retryCount: nextRetry,
        errorMessage,
        scheduledFor,
        claimedAt: null,
        claimedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, id))
      .returning();
    if (!row) throw new Error(`[@hal/db] job ${id} not found`);
    return row;
  }

  async findByStatus(status: JobStatus, limit = 50): Promise<JobRow[]> {
    return this.db.select().from(jobs).where(eq(jobs.status, status)).limit(limit);
  }

  /** Release jobs that were claimed but never started — typically by crashed workers. */
  async reapStuckClaims(olderThanMs: number): Promise<number> {
    const threshold = new Date(Date.now() - olderThanMs);
    const result = await this.db
      .update(jobs)
      .set({
        status: 'pending',
        claimedAt: null,
        claimedBy: null,
        updatedAt: new Date(),
      })
      .where(and(eq(jobs.status, 'claimed'), lt(jobs.claimedAt, threshold)))
      .returning({ id: jobs.id });
    return result.length;
  }
}
