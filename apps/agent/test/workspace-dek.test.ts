import { describe, it, expect } from 'bun:test';
import { LocalKms } from '@hal/crypto';
import { createEnvelopeService } from '@hal/crypto';
import { encryptJoinMeetingPayload, decryptJoinMeetingPayload } from '../src/workspace';
import type { WorkspaceRow } from '@hal/db';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function workspaceFromDek(dek: { wrappedDek: Uint8Array; keyId: string }): WorkspaceRow {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'personal',
    plan: 'personal',
    featureFlags: {},
    dekWrapped: dek.wrappedDek,
    dekKmsKeyId: dek.keyId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('workspace DEK job payloads', () => {
  it('decrypts after a new envelope instance (worker restart)', async () => {
    const master = toHex(crypto.getRandomValues(new Uint8Array(32)));
    const enqueueEnv = createEnvelopeService(new LocalKms({ masterKeyHex: master }));
    const dek = await enqueueEnv.generateUserDek();
    const workspace = workspaceFromDek(dek);
    const meetingId = '22222222-2222-2222-2222-222222222222';

    const payloadCt = await encryptJoinMeetingPayload(enqueueEnv, workspace, meetingId);

    const workerEnv = createEnvelopeService(new LocalKms({ masterKeyHex: master }));
    const payload = await decryptJoinMeetingPayload(workerEnv, workspace, payloadCt);
    expect(payload.meetingId).toBe(meetingId);
  });

  it('does not decrypt with a different workspace DEK', async () => {
    const master = toHex(crypto.getRandomValues(new Uint8Array(32)));
    const env = createEnvelopeService(new LocalKms({ masterKeyHex: master }));
    const a = workspaceFromDek(await env.generateUserDek());
    const b = workspaceFromDek(await env.generateUserDek());
    const ct = await encryptJoinMeetingPayload(env, a, '33333333-3333-3333-3333-333333333333');
    await expect(decryptJoinMeetingPayload(env, b, ct)).rejects.toThrow();
  });
});
