import type { Kms, KmsKeyMetadata, WrapResult } from './types';
import { DekUnwrapFailedError } from '../errors';

const DEK_BYTES = 32;
const IV_BYTES = 12; // AES-GCM standard

export interface LocalKmsOptions {
  /**
   * Master key as a hex-encoded 32-byte buffer. Generate with
   *   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   * Set in env as HAL_LOCAL_KMS_KEY.
   */
  masterKeyHex: string;
  /** Key version identifier. Bump when rotating. Default 'local-v1'. */
  keyId?: string;
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

/**
 * Local KMS using Node/Bun built-in WebCrypto AES-256-GCM. The master key
 * lives in process memory from env config — suitable for development and
 * single-tenant self-hosts where the operator manages the master key.
 *
 * For multi-tenant production, use Vault / AWS KMS / GCP KMS.
 *
 * Wrap wire format:
 *   [ iv(12) | aes_gcm_ciphertext(32) | gcm_auth_tag(16) ]
 *
 * AES-256-GCM provides authenticated encryption — tampering throws on unwrap.
 */
export class LocalKms implements Kms {
  private masterKey: CryptoKey | null = null;
  private ready = false;

  constructor(private readonly opts: LocalKmsOptions) {
    if (!opts.masterKeyHex) {
      throw new Error('[@hal/crypto] LocalKms requires masterKeyHex');
    }
    if (!/^[0-9a-fA-F]{64}$/.test(opts.masterKeyHex)) {
      throw new Error(
        '[@hal/crypto] LocalKms masterKeyHex must be 64 hex chars (32 bytes)',
      );
    }
  }

  async initialize(): Promise<void> {
    if (this.ready) return;
    const raw = fromHex(this.opts.masterKeyHex);
    this.masterKey = await crypto.subtle.importKey(
      'raw',
      raw as unknown as ArrayBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
    raw.fill(0);
    this.ready = true;
  }

  async describe(): Promise<KmsKeyMetadata> {
    await this.initialize();
    return {
      keyId: this.opts.keyId ?? 'local-v1',
      provider: 'local',
    };
  }

  async wrap(dek: Uint8Array): Promise<WrapResult> {
    await this.initialize();
    if (!this.masterKey) {
      throw new Error('[@hal/crypto] LocalKms not initialized');
    }
    if (dek.length !== DEK_BYTES) {
      throw new Error(`[@hal/crypto] DEK must be ${DEK_BYTES} bytes, got ${dek.length}`);
    }
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const ct = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv as unknown as ArrayBuffer },
        this.masterKey,
        dek as unknown as ArrayBuffer,
      ),
    );
    const wrapped = new Uint8Array(IV_BYTES + ct.length);
    wrapped.set(iv, 0);
    wrapped.set(ct, IV_BYTES);
    return {
      wrapped,
      keyId: this.opts.keyId ?? 'local-v1',
    };
  }

  async unwrap(wrapped: Uint8Array, _keyId: string): Promise<Uint8Array> {
    await this.initialize();
    if (!this.masterKey) {
      throw new Error('[@hal/crypto] LocalKms not initialized');
    }
    if (wrapped.length < IV_BYTES + 16 + DEK_BYTES) {
      throw new DekUnwrapFailedError('wrapped DEK is too short');
    }
    const iv = wrapped.slice(0, IV_BYTES);
    const ct = wrapped.slice(IV_BYTES);
    try {
      const plain = new Uint8Array(
        await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv as unknown as ArrayBuffer },
          this.masterKey,
          ct as unknown as ArrayBuffer,
        ),
      );
      return plain;
    } catch (e) {
      throw new DekUnwrapFailedError('authentication failed', e);
    }
  }

  async generateDek(): Promise<{ dek: Uint8Array; wrapped: WrapResult }> {
    await this.initialize();
    const dek = crypto.getRandomValues(new Uint8Array(DEK_BYTES));
    const wrapped = await this.wrap(dek);
    return { dek, wrapped };
  }
}
