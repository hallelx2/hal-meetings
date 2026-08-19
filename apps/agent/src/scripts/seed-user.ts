import { loadConfig } from '../config';
import { createDb, makeRepositories } from '@hal/db';
import { createKmsFromEnv, createEnvelopeService } from '@hal/crypto';

const emailFlag = process.argv.indexOf('--email');
const nameFlag = process.argv.indexOf('--name');
const email = emailFlag >= 0 ? process.argv[emailFlag + 1] : undefined;
const name = nameFlag >= 0 ? process.argv[nameFlag + 1] : undefined;

if (!email) {
  console.error('usage: bun run src/scripts/seed-user.ts --email you@example.com [--name You]');
  process.exit(1);
}

const cfg = loadConfig();
const dbHandle = createDb({ url: cfg.databaseUrl });
const repos = makeRepositories(dbHandle.db);
const kms = createKmsFromEnv();
await kms.initialize();
const envelope = createEnvelopeService(kms);

const existing = await repos.users.findByEmail(email);
if (existing) {
  console.log(existing.id);
  console.error(`user already exists: ${email}`);
  await dbHandle.close();
  process.exit(0);
}

const dek = await envelope.generateUserDek();
const user = await repos.users.create({
  email,
  name: name ?? email.split('@')[0]!,
  dekWrapped: dek.wrappedDek,
  dekKmsKeyId: dek.keyId,
});

console.log(user.id);
await dbHandle.close();
