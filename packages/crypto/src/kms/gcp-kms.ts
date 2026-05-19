import type { Kms, KmsKeyMetadata, WrapResult } from './types';
import { KmsUnavailableError, NotYetIntegratedError } from '../errors';

export interface GcpKmsOptions {
  /** Project id. */
  projectId: string;
  /** Location, e.g. 'global', 'us-central1'. */
  location: string;
  /** Key ring name. */
  keyRing: string;
  /** Crypto key name within the ring. */
  keyName: string;
}

/**
 * GCP KMS implementation (placeholder until SDK is wired).
 *
 * Real implementation should use `@google-cloud/kms` and call:
 *   - cryptoKeys.encrypt → wrap
 *   - cryptoKeys.decrypt → unwrap
 *   - generateRandomBytes → for DEK material (no native DataKey op like AWS)
 *
 * Same pattern as AwsKms: lazy SDK load, instance per process.
 */
export class GcpKms implements Kms {
  constructor(private readonly opts: GcpKmsOptions) {
    if (!opts.projectId || !opts.location || !opts.keyRing || !opts.keyName) {
      throw new KmsUnavailableError('gcp-kms: missing projectId/location/keyRing/keyName');
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async initialize(): Promise<void> {
    throw new NotYetIntegratedError('gcp-kms');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async describe(): Promise<KmsKeyMetadata> {
    throw new NotYetIntegratedError('gcp-kms');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async wrap(_dek: Uint8Array): Promise<WrapResult> {
    throw new NotYetIntegratedError('gcp-kms');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async unwrap(_wrapped: Uint8Array, _keyId: string): Promise<Uint8Array> {
    throw new NotYetIntegratedError('gcp-kms');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async generateDek(): Promise<{ dek: Uint8Array; wrapped: WrapResult }> {
    throw new NotYetIntegratedError('gcp-kms');
  }
}
