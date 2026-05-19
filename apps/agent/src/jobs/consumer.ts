import { hostname } from 'node:os';
import type { Repositories, JobRow, JobKind } from '@hal/db';
import type { Logger } from '../logger';

export interface JobHandler {
  (job: JobRow): Promise<void>;
}

export type JobHandlerMap = Partial<Record<JobKind, JobHandler>>;

export interface JobConsumerOptions {
  repos: Repositories;
  handlers: JobHandlerMap;
  log: Logger;
  /** Worker identity for jobs.claimed_by. Default `${hostname}-${pid}`. */
  workerId?: string;
  /** Job kinds we will claim. Default: all in handlers map. */
  kinds?: JobKind[];
  /** Polling interval in ms when no work is available. Default 2000. */
  pollIntervalMs?: number;
  /** Max concurrent in-flight jobs. Default 1. */
  concurrency?: number;
  /** Reap stuck claims older than this. Default 5 minutes. */
  reapAfterMs?: number;
}

/**
 * Postgres-backed job consumer. Polls `jobs` using SKIP LOCKED, dispatches
 * to handlers, retries on failure with exponential back-off.
 *
 * This is M5-level work — sufficient for Phase 0. Replace with Temporal
 * at M6 when meeting durations + multi-step workflows make polling brittle.
 */
export class JobConsumer {
  private inflight = 0;
  private running = false;
  private readonly workerId: string;
  private readonly kinds: JobKind[];
  private timer: NodeJS.Timeout | null = null;
  private reapTimer: NodeJS.Timeout | null = null;

  constructor(private readonly opts: JobConsumerOptions) {
    this.workerId = opts.workerId ?? `${hostname()}-${process.pid}`;
    this.kinds = opts.kinds ?? (Object.keys(opts.handlers) as JobKind[]);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.opts.log.info({ workerId: this.workerId, kinds: this.kinds }, 'job consumer started');
    this.poll();
    this.reapTimer = setInterval(() => {
      this.opts.repos.jobs
        .reapStuckClaims(this.opts.reapAfterMs ?? 5 * 60_000)
        .then((n) => {
          if (n > 0) this.opts.log.warn({ reaped: n }, 'reaped stuck job claims');
        })
        .catch((e) => this.opts.log.error({ err: (e as Error).message }, 'reap failed'));
    }, 60_000);
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    if (this.reapTimer) clearInterval(this.reapTimer);
    // wait for inflight to drain (best effort, 30s cap)
    const deadline = Date.now() + 30_000;
    while (this.inflight > 0 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 250));
    }
    this.opts.log.info('job consumer stopped');
  }

  private schedule(ms: number): void {
    if (!this.running) return;
    this.timer = setTimeout(() => this.poll(), ms);
  }

  private async poll(): Promise<void> {
    if (!this.running) return;
    const concurrency = this.opts.concurrency ?? 1;
    if (this.inflight >= concurrency) {
      this.schedule(500);
      return;
    }

    try {
      const claimed = await this.opts.repos.jobs.claim({
        workerId: this.workerId,
        kinds: this.kinds,
        limit: concurrency - this.inflight,
      });
      if (claimed.length === 0) {
        this.schedule(this.opts.pollIntervalMs ?? 2_000);
        return;
      }
      for (const job of claimed) {
        this.inflight++;
        this.handle(job)
          .catch((e) => {
            this.opts.log.error({ jobId: job.id, err: (e as Error).message }, 'job handler threw');
          })
          .finally(() => {
            this.inflight--;
          });
      }
      this.schedule(50);
    } catch (e) {
      this.opts.log.error({ err: (e as Error).message }, 'poll failed');
      this.schedule(5_000);
    }
  }

  private async handle(job: JobRow): Promise<void> {
    const handler = this.opts.handlers[job.kind as JobKind];
    if (!handler) {
      this.opts.log.warn({ jobId: job.id, kind: job.kind }, 'no handler registered');
      await this.opts.repos.jobs.markFailed(job.id, `no handler for kind=${job.kind}`);
      return;
    }
    await this.opts.repos.jobs.markStarted(job.id);
    try {
      await handler(job);
      await this.opts.repos.jobs.markCompleted(job.id);
      this.opts.log.info({ jobId: job.id, kind: job.kind }, 'job completed');
    } catch (e) {
      const msg = (e as Error).message;
      this.opts.log.error({ jobId: job.id, kind: job.kind, err: msg }, 'job failed');
      await this.opts.repos.jobs.markFailed(job.id, msg);
    }
  }
}
