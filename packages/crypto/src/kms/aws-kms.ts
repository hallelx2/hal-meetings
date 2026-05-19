import type { Kms, KmsKeyMetadata, WrapResult } from './types';
import { KmsUnavailableError, NotYetIntegratedError } from '../errors';

export interface AwsKmsOptions {
  /** AWS region the KMS key is in. */
  region: string;
  /** Customer-managed KMS key id, ARN, or alias (e.g. alias/hal-master). */
  keyId: string;
  /** Optional explicit credentials. Default uses standard AWS SDK chain. */
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
}

/**
 * AWS KMS implementation (placeholder until SDK is wired).
 *
 * Real implementation should use `@aws-sdk/client-kms` and call:
 *   - GenerateDataKey   → returns plaintext DEK + ciphertext blob in one trip
 *   - Decrypt           → unwrap an existing ciphertext blob
 *   - Encrypt           → wrap a DEK we already have
 *
 * Why this is a placeholder: needs AWS credentials and a customer-managed
 * KMS key to test against. When ready, install the AWS SDK as an optional
 * peer dep and lazily import inside `initialize()` so users who don't pick
 * the aws-kms provider don't pull SDK weight.
 */
export class AwsKms implements Kms {
  constructor(private readonly opts: AwsKmsOptions) {
    if (!opts.region || !opts.keyId) {
      throw new KmsUnavailableError('aws-kms: missing region/keyId');
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async initialize(): Promise<void> {
    throw new NotYetIntegratedError('aws-kms');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async describe(): Promise<KmsKeyMetadata> {
    throw new NotYetIntegratedError('aws-kms');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async wrap(_dek: Uint8Array): Promise<WrapResult> {
    throw new NotYetIntegratedError('aws-kms');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async unwrap(_wrapped: Uint8Array, _keyId: string): Promise<Uint8Array> {
    throw new NotYetIntegratedError('aws-kms');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async generateDek(): Promise<{ dek: Uint8Array; wrapped: WrapResult }> {
    throw new NotYetIntegratedError('aws-kms');
  }
}
