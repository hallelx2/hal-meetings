export class MediaError extends Error {
  readonly code: string;
  constructor(message: string, code: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'MediaError';
    this.code = code;
  }
}

export class ProviderNotConfiguredError extends MediaError {
  constructor(provider: string, missing: string) {
    super(
      `Provider "${provider}" not configured — missing ${missing}`,
      'PROVIDER_NOT_CONFIGURED',
    );
    this.name = 'ProviderNotConfiguredError';
  }
}

export class SttStreamClosedError extends MediaError {
  constructor() {
    super('STT stream is closed; cannot write more audio', 'STT_STREAM_CLOSED');
    this.name = 'SttStreamClosedError';
  }
}

export class TranscriptionFailedError extends MediaError {
  constructor(provider: string, reason: string, cause?: unknown) {
    super(`${provider} transcription failed: ${reason}`, 'TRANSCRIPTION_FAILED', { cause });
    this.name = 'TranscriptionFailedError';
  }
}

export class LlmRequestFailedError extends MediaError {
  constructor(provider: string, reason: string, cause?: unknown) {
    super(`${provider} LLM request failed: ${reason}`, 'LLM_REQUEST_FAILED', { cause });
    this.name = 'LlmRequestFailedError';
  }
}
