import type { Kms } from './kms/types';
import { CiphertextAuthFailedError } from './errors';

const IV_BYTES = 12; // AES-GCM
const GCM_TAG_BYTES = 16;
const VERSION_BYTE = 0x01; // bump if we change the envelope format

export interface EnvelopeService {
  /** Decrypt ciphertext using a DEK obtained from KMS via the wrapped key. */
  decrypt(input: { wrappedDek: Uint8Array; keyId: string; ciphertext: Uint8Array }): Promise<Uint8Array>;

  /** Encrypt plaintext under the DEK identified by `wrappedDek`. */
  encrypt(input: { wrappedDek: Uint8Array; keyId: string; plaintext: Uint8Array }): Promise<Uint8Array>;

  /** Convenience: encrypt a UTF-8 string and return ciphertext bytes. */
  encryptString(input: { wrappedDek: Uint8Array; keyId: string; plaintext: string }): Promise<Uint8Array>;

  /** Convenience: decrypt to a UTF-8 string. */
  decryptString(input: { wrappedDek: Uint8Array; keyId: string; ciphertext: Uint8Array }): Promise<string>;

  /** Encrypt structured JSON. */
  encryptJson<T>(input: { wrappedDek: Uint8Array; keyId: string; value: T }): Promise<Uint8Array>;

  /** Decrypt structured JSON. */
  decryptJson<T = unknown>(input: { wrappedDek: Uint8Array; keyId: string; ciphertext: Uint8Array }): Promise<T>;

  /** Create a new user's DEK (wrapped) ready to insert into the users table. */
  generateUserDek(): Promise<{ wrappedDek: Uint8Array; keyId: string }>;
}

/**
 * The envelope encryption service. Holds a Kms reference; never caches
 * plaintext DEKs across calls (each encrypt/decrypt round-trips to the KMS).
 *
 * Wire format (concatenated bytes, fixed offsets):
 *   [ version(1) | iv(12) | aes_gcm_ciphertext(N+16) ]
 *
 * AES-256-GCM via WebCrypto. The 16-byte authentication tag is appended by
 * the algorithm and verified on decrypt. Any tampering → CiphertextAuthFailedError.
 */
export class EnvelopeServiceImpl implements EnvelopeService {
  constructor(private readonly kms: Kms) {}

  async generateUserDek(): Promise<{ wrappedDek: Uint8Array; keyId: string }> {
    const { dek, wrapped } = await this.kms.generateDek();
    dek.fill(0);
    return { wrappedDek: wrapped.wrapped, keyId: wrapped.keyId };
  }

  private async importDek(dekBytes: Uint8Array): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      'raw',
      dekBytes as unknown as ArrayBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  async encrypt(input: {
    wrappedDek: Uint8Array;
    keyId: string;
    plaintext: Uint8Array;
  }): Promise<Uint8Array> {
    const dek = await this.kms.unwrap(input.wrappedDek, input.keyId);
    try {
      const key = await this.importDek(dek);
      const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
      const ct = new Uint8Array(
        await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: iv as unknown as ArrayBuffer },
          key,
          input.plaintext as unknown as ArrayBuffer,
        ),
      );
      const out = new Uint8Array(1 + IV_BYTES + ct.length);
      out[0] = VERSION_BYTE;
      out.set(iv, 1);
      out.set(ct, 1 + IV_BYTES);
      return out;
    } finally {
      dek.fill(0);
    }
  }

  async decrypt(input: {
    wrappedDek: Uint8Array;
    keyId: string;
    ciphertext: Uint8Array;
  }): Promise<Uint8Array> {
    if (input.ciphertext.length < 1 + IV_BYTES + GCM_TAG_BYTES) {
      throw new CiphertextAuthFailedError();
    }
    if (input.ciphertext[0] !== VERSION_BYTE) {
      throw new Error(`[@hal/crypto] unknown envelope version byte: ${input.ciphertext[0]}`);
    }
    const dek = await this.kms.unwrap(input.wrappedDek, input.keyId);
    try {
      const key = await this.importDek(dek);
      const iv = input.ciphertext.slice(1, 1 + IV_BYTES);
      const ct = input.ciphertext.slice(1 + IV_BYTES);
      try {
        return new Uint8Array(
          await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv as unknown as ArrayBuffer },
            key,
            ct as unknown as ArrayBuffer,
          ),
        );
      } catch {
        throw new CiphertextAuthFailedError();
      }
    } finally {
      dek.fill(0);
    }
  }

  async encryptString(input: {
    wrappedDek: Uint8Array;
    keyId: string;
    plaintext: string;
  }): Promise<Uint8Array> {
    return this.encrypt({
      wrappedDek: input.wrappedDek,
      keyId: input.keyId,
      plaintext: new TextEncoder().encode(input.plaintext),
    });
  }

  async decryptString(input: {
    wrappedDek: Uint8Array;
    keyId: string;
    ciphertext: Uint8Array;
  }): Promise<string> {
    const bytes = await this.decrypt(input);
    return new TextDecoder().decode(bytes);
  }

  async encryptJson<T>(input: { wrappedDek: Uint8Array; keyId: string; value: T }): Promise<Uint8Array> {
    return this.encryptString({
      wrappedDek: input.wrappedDek,
      keyId: input.keyId,
      plaintext: JSON.stringify(input.value),
    });
  }

  async decryptJson<T = unknown>(input: {
    wrappedDek: Uint8Array;
    keyId: string;
    ciphertext: Uint8Array;
  }): Promise<T> {
    const s = await this.decryptString(input);
    return JSON.parse(s) as T;
  }
}

export function createEnvelopeService(kms: Kms): EnvelopeService {
  return new EnvelopeServiceImpl(kms);
}
