import { describe, it, expect } from 'bun:test';
import { LocalKms } from '../src/kms/local';
import { createEnvelopeService } from '../src/envelope';
import { CiphertextAuthFailedError, DekUnwrapFailedError } from '../src/errors';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function freshLocalKms(): LocalKms {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  return new LocalKms({ masterKeyHex: toHex(raw) });
}

describe('envelope encryption — round-trip', () => {
  it('encrypts and decrypts a UTF-8 string', async () => {
    const kms = freshLocalKms();
    const env = createEnvelopeService(kms);
    const { wrappedDek, keyId } = await env.generateUserDek();

    const plaintext = "Hal joined the meeting on Halleluyah's behalf.";
    const ct = await env.encryptString({ wrappedDek, keyId, plaintext });
    const round = await env.decryptString({ wrappedDek, keyId, ciphertext: ct });

    expect(round).toBe(plaintext);
  });

  it('encrypts and decrypts JSON', async () => {
    const kms = freshLocalKms();
    const env = createEnvelopeService(kms);
    const { wrappedDek, keyId } = await env.generateUserDek();

    const value = {
      summary: 'launch slipped a week, QA signed off',
      action_items: ['email support@', 'update CRM'],
    };
    const ct = await env.encryptJson({ wrappedDek, keyId, value });
    const round = await env.decryptJson<typeof value>({ wrappedDek, keyId, ciphertext: ct });

    expect(round).toEqual(value);
  });

  it('produces different ciphertext for same plaintext (fresh iv)', async () => {
    const kms = freshLocalKms();
    const env = createEnvelopeService(kms);
    const { wrappedDek, keyId } = await env.generateUserDek();
    const plaintext = 'same input';
    const a = await env.encryptString({ wrappedDek, keyId, plaintext });
    const b = await env.encryptString({ wrappedDek, keyId, plaintext });
    expect(a).not.toEqual(b);
  });
});

describe('envelope encryption — tampering', () => {
  it('throws CiphertextAuthFailedError on bit-flip in ciphertext body', async () => {
    const kms = freshLocalKms();
    const env = createEnvelopeService(kms);
    const { wrappedDek, keyId } = await env.generateUserDek();
    const ct = await env.encryptString({ wrappedDek, keyId, plaintext: 'do not tamper' });

    const tampered = new Uint8Array(ct);
    const last = tampered.length - 1;
    tampered[last] = (tampered[last] ?? 0) ^ 0xff;

    await expect(
      env.decryptString({ wrappedDek, keyId, ciphertext: tampered }),
    ).rejects.toBeInstanceOf(CiphertextAuthFailedError);
  });

  it('throws on truncated ciphertext', async () => {
    const kms = freshLocalKms();
    const env = createEnvelopeService(kms);
    const { wrappedDek, keyId } = await env.generateUserDek();
    const ct = await env.encryptString({ wrappedDek, keyId, plaintext: 'short' });

    const truncated = ct.slice(0, 10);
    await expect(
      env.decryptString({ wrappedDek, keyId, ciphertext: truncated }),
    ).rejects.toBeInstanceOf(CiphertextAuthFailedError);
  });

  it('throws on wrong DEK', async () => {
    const kms1 = freshLocalKms();
    const kms2 = freshLocalKms();

    const env1 = createEnvelopeService(kms1);
    const env2 = createEnvelopeService(kms2);

    const u1 = await env1.generateUserDek();
    const u2 = await env2.generateUserDek();

    const ct = await env1.encryptString({
      wrappedDek: u1.wrappedDek,
      keyId: u1.keyId,
      plaintext: 'user-1 secret',
    });

    await expect(
      env2.decryptString({
        wrappedDek: u1.wrappedDek,
        keyId: u1.keyId,
        ciphertext: ct,
      }),
    ).rejects.toBeInstanceOf(DekUnwrapFailedError);

    const ct2 = await env2.encryptString({
      wrappedDek: u2.wrappedDek,
      keyId: u2.keyId,
      plaintext: 'user-2 secret',
    });
    expect(
      await env2.decryptString({
        wrappedDek: u2.wrappedDek,
        keyId: u2.keyId,
        ciphertext: ct2,
      }),
    ).toBe('user-2 secret');
  });
});

describe('LocalKms', () => {
  it('rejects malformed master keys', () => {
    expect(() => new LocalKms({ masterKeyHex: 'too-short' })).toThrow();
    expect(() => new LocalKms({ masterKeyHex: 'g'.repeat(64) })).toThrow();
  });

  it('reports describe() metadata', async () => {
    const kms = freshLocalKms();
    const meta = await kms.describe();
    expect(meta.provider).toBe('local');
    expect(meta.keyId).toBe('local-v1');
  });

  it('generateDek returns a 32-byte DEK and a wrapped copy', async () => {
    const kms = freshLocalKms();
    const { dek, wrapped } = await kms.generateDek();
    expect(dek.length).toBe(32);
    expect(wrapped.wrapped.length).toBeGreaterThan(32);
  });
});
