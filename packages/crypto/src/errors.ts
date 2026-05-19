/**
 * Discriminated error types so callers can pattern-match on failure mode
 * without parsing error strings.
 */

export class CryptoError extends Error {
  readonly code: string;
  constructor(message: string, code: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'CryptoError';
    this.code = code;
  }
}

export class KmsUnavailableError extends CryptoError {
  constructor(provider: string, cause?: unknown) {
    super(`KMS provider "${provider}" is unavailable`, 'KMS_UNAVAILABLE', { cause });
    this.name = 'KmsUnavailableError';
  }
}

export class KmsKeyNotFoundError extends CryptoError {
  constructor(keyId: string) {
    super(`KMS key "${keyId}" not found`, 'KMS_KEY_NOT_FOUND');
    this.name = 'KmsKeyNotFoundError';
  }
}

export class DekUnwrapFailedError extends CryptoError {
  constructor(reason: string, cause?: unknown) {
    super(`Failed to unwrap DEK: ${reason}`, 'DEK_UNWRAP_FAILED', { cause });
    this.name = 'DekUnwrapFailedError';
  }
}

export class CiphertextAuthFailedError extends CryptoError {
  constructor() {
    super(
      'Ciphertext authentication failed — data has been tampered with or wrong key was used',
      'CIPHERTEXT_AUTH_FAILED',
    );
    this.name = 'CiphertextAuthFailedError';
  }
}

export class NotYetIntegratedError extends CryptoError {
  constructor(provider: string) {
    super(
      `KMS provider "${provider}" is not yet integrated. Use 'local' for development or 'vault' once Vault is configured.`,
      'NOT_YET_INTEGRATED',
    );
    this.name = 'NotYetIntegratedError';
  }
}
