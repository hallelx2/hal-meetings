/**
 * Pluggable KMS interface. The master encryption key (KEK) lives inside the
 * KMS — never in app memory. All KMS calls go through this interface so we
 * can swap providers (local libsodium for dev, Vault / AWS KMS / GCP KMS for
 * production) without touching call sites.
 */

export interface KmsKeyMetadata {
  /** Stable id for the master key version (used for rotation tracking). */
  keyId: string;
  /** Human-readable provider name: 'local' | 'vault' | 'aws-kms' | 'gcp-kms'. */
  provider: string;
}

export interface WrapResult {
  /** The wrapped DEK as opaque bytes — store in users.dek_wrapped. */
  wrapped: Uint8Array;
  /** Which key version did the wrapping. Store in users.dek_kms_key_id. */
  keyId: string;
}

/**
 * The KMS interface every provider implements.
 *
 * Conceptual model:
 *   - Each user has a unique DEK (32-byte symmetric key).
 *   - The DEK is generated locally and then *wrapped* (encrypted) by the KMS
 *     master key.
 *   - We store only the wrapped DEK in the database.
 *   - When we need to encrypt/decrypt user data, we ask the KMS to *unwrap*
 *     the DEK, use it, and discard the plaintext DEK from memory.
 *
 * The plaintext master key never leaves the KMS. Compromising the database
 * alone yields only ciphertext + wrapped DEKs — useless without KMS access.
 */
export interface Kms {
  /** Lazily initialize underlying SDK / handshake / pool. Idempotent. */
  initialize(): Promise<void>;

  /** Health probe. Returns metadata about the active master key. */
  describe(): Promise<KmsKeyMetadata>;

  /** Wrap a plaintext DEK with the master key. */
  wrap(dek: Uint8Array): Promise<WrapResult>;

  /**
   * Unwrap a previously wrapped DEK. The caller must zero the returned bytes
   * after use (we copy into a fresh Uint8Array so the caller's `.fill(0)` is
   * effective).
   */
  unwrap(wrapped: Uint8Array, keyId: string): Promise<Uint8Array>;

  /** Generate a fresh random DEK and wrap it in one round-trip. */
  generateDek(): Promise<{ dek: Uint8Array; wrapped: WrapResult }>;
}
