import type { Db } from '../client';
import { UsersRepository } from './users';
import { OauthTokensRepository } from './oauth-tokens';
import { MeetingsRepository } from './meetings';
import { TranscriptsRepository } from './transcripts';
import { JobsRepository } from './jobs';
import { AuditLogRepository } from './audit-log';

export { UsersRepository, OauthTokensRepository, MeetingsRepository, TranscriptsRepository, JobsRepository, AuditLogRepository };

/**
 * One-stop factory that wires all repositories onto a single Drizzle db
 * handle. Use this in the bot worker, the dashboard server, the agent — any
 * code that talks to the database.
 */
export interface Repositories {
  users: UsersRepository;
  oauthTokens: OauthTokensRepository;
  meetings: MeetingsRepository;
  transcripts: TranscriptsRepository;
  jobs: JobsRepository;
  auditLog: AuditLogRepository;
}

export function makeRepositories(db: Db): Repositories {
  return {
    users: new UsersRepository(db),
    oauthTokens: new OauthTokensRepository(db),
    meetings: new MeetingsRepository(db),
    transcripts: new TranscriptsRepository(db),
    jobs: new JobsRepository(db),
    auditLog: new AuditLogRepository(db),
  };
}
