import type { Kms, KmsKeyMetadata, WrapResult } from './types';
import { KmsUnavailableError, NotYetIntegratedError } from '../errors';

export interface VaultKmsOptions {
  /** Vault address, e.g. https://vault.internal:8200 */
  address: string;
  /** Vault token (read from env or via a service-account loader). */
  token: string;
  /** Transit key name in Vault. */
  keyName: string;
  /** Vault namespace (Enterprise feature, optional). */
  namespace?: string;
}

/**
 * HashiCorp Vault Transit-based KMS.
 *
 * Spec for the real implementation (not yet wired):
 *   - POST /v1/transit/encrypt/<keyName>  with plaintext base64 → wrap
 *   - POST /v1/transit/decrypt/<keyName>  with ciphertext       → unwrap
 *   - POST /v1/transit/datakey/plaintext/<keyName> → generateDek (returns
 *     plaintext + ciphertext of DEK in one round-trip — most efficient path)
 *
 * Why this is a placeholder for now: needs a live Vault instance + token
 * to test against, and the test environment is not yet set up. When ready,
 * implement using fetch + the documented Transit API. The interface here is
 * the same contract LocalKms implements, so switching is a config flip.
 */
export class VaultKms implements Kms {
  constructor(private readonly opts: VaultKmsOptions) {
    if (!opts.address || !opts.token || !opts.keyName) {
      throw new KmsUnavailableError('vault: missing address/token/keyName');
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async initialize(): Promise<void> {
    throw new NotYetIntegratedError('vault');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async describe(): Promise<KmsKeyMetadata> {
    throw new NotYetIntegratedError('vault');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async wrap(_dek: Uint8Array): Promise<WrapResult> {
    throw new NotYetIntegratedError('vault');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async unwrap(_wrapped: Uint8Array, _keyId: string): Promise<Uint8Array> {
    throw new NotYetIntegratedError('vault');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async generateDek(): Promise<{ dek: Uint8Array; wrapped: WrapResult }> {
    throw new NotYetIntegratedError('vault');
  }
}
