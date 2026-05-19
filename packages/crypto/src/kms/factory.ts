import type { Kms } from './types';
import { LocalKms } from './local';
import { VaultKms } from './vault';
import { AwsKms } from './aws-kms';
import { GcpKms } from './gcp-kms';
import { KmsUnavailableError } from '../errors';

export type KmsProviderName = 'local' | 'vault' | 'aws-kms' | 'gcp-kms';

export interface KmsFactoryEnv {
  KMS_PROVIDER?: string;

  // local
  HAL_LOCAL_KMS_KEY?: string;
  HAL_LOCAL_KMS_KEY_ID?: string;

  // vault
  VAULT_ADDR?: string;
  VAULT_TOKEN?: string;
  VAULT_TRANSIT_KEY?: string;
  VAULT_NAMESPACE?: string;

  // aws-kms
  AWS_REGION?: string;
  AWS_KMS_KEY_ID?: string;

  // gcp-kms
  GCP_PROJECT_ID?: string;
  GCP_KMS_LOCATION?: string;
  GCP_KMS_KEY_RING?: string;
  GCP_KMS_KEY_NAME?: string;
}

/**
 * Create a Kms instance from environment variables. The provider is picked
 * by KMS_PROVIDER (defaults to 'local' for ergonomic dev). Each provider
 * has its own required env vars; missing values throw a typed error.
 */
export function createKmsFromEnv(env: KmsFactoryEnv = process.env as KmsFactoryEnv): Kms {
  const provider = (env.KMS_PROVIDER ?? 'local') as KmsProviderName;

  switch (provider) {
    case 'local': {
      const masterKeyHex = env.HAL_LOCAL_KMS_KEY;
      if (!masterKeyHex) {
        throw new KmsUnavailableError(
          'local: HAL_LOCAL_KMS_KEY env var not set (64-hex-char master key)',
        );
      }
      return new LocalKms({
        masterKeyHex,
        keyId: env.HAL_LOCAL_KMS_KEY_ID,
      });
    }

    case 'vault': {
      const address = env.VAULT_ADDR;
      const token = env.VAULT_TOKEN;
      const keyName = env.VAULT_TRANSIT_KEY;
      if (!address || !token || !keyName) {
        throw new KmsUnavailableError(
          'vault: VAULT_ADDR / VAULT_TOKEN / VAULT_TRANSIT_KEY must all be set',
        );
      }
      return new VaultKms({ address, token, keyName, namespace: env.VAULT_NAMESPACE });
    }

    case 'aws-kms': {
      const region = env.AWS_REGION;
      const keyId = env.AWS_KMS_KEY_ID;
      if (!region || !keyId) {
        throw new KmsUnavailableError('aws-kms: AWS_REGION and AWS_KMS_KEY_ID must be set');
      }
      return new AwsKms({ region, keyId });
    }

    case 'gcp-kms': {
      const projectId = env.GCP_PROJECT_ID;
      const location = env.GCP_KMS_LOCATION;
      const keyRing = env.GCP_KMS_KEY_RING;
      const keyName = env.GCP_KMS_KEY_NAME;
      if (!projectId || !location || !keyRing || !keyName) {
        throw new KmsUnavailableError(
          'gcp-kms: GCP_PROJECT_ID / GCP_KMS_LOCATION / GCP_KMS_KEY_RING / GCP_KMS_KEY_NAME must all be set',
        );
      }
      return new GcpKms({ projectId, location, keyRing, keyName });
    }

    default:
      throw new KmsUnavailableError(`unknown provider "${provider}"`);
  }
}
