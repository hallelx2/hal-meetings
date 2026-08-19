import 'server-only';

import { createEnvelopeService, createKmsFromEnv, type EnvelopeService } from '@hal/crypto';
import { createDb, makeRepositories, type DbHandle, type Repositories } from '@hal/db';

let handle: DbHandle | null = null;
let repos: Repositories | null = null;
let envelope: EnvelopeService | null = null;

export function getDbHandle(): DbHandle {
  if (!handle) handle = createDb();
  return handle;
}

export function getRepos(): Repositories {
  if (!repos) repos = makeRepositories(getDbHandle().db);
  return repos;
}

export function getEnvelope(): EnvelopeService {
  if (!envelope) envelope = createEnvelopeService(createKmsFromEnv());
  return envelope;
}
