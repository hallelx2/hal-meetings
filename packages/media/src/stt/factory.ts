import type { SttProvider } from './types';
import { WhisperLocalStt } from './whisper-local';
import { DeepgramStt } from './deepgram';
import { ProviderNotConfiguredError } from '../errors';

export type SttProviderName = 'whisper-local' | 'deepgram';

export interface SttFactoryEnv {
  STT_PROVIDER?: string;
  // whisper-local
  WHISPER_BINARY?: string;
  WHISPER_MODEL?: string;
  WHISPER_THREADS?: string;
  // deepgram
  DEEPGRAM_API_KEY?: string;
  DEEPGRAM_MODEL?: string;
}

export function createSttFromEnv(env: SttFactoryEnv = process.env as SttFactoryEnv): SttProvider {
  const provider = (env.STT_PROVIDER ?? 'whisper-local') as SttProviderName;

  switch (provider) {
    case 'whisper-local': {
      const binaryPath = env.WHISPER_BINARY;
      const modelPath = env.WHISPER_MODEL;
      if (!binaryPath || !modelPath) {
        throw new ProviderNotConfiguredError(
          'whisper-local',
          'WHISPER_BINARY and WHISPER_MODEL env vars',
        );
      }
      return new WhisperLocalStt({
        binaryPath,
        modelPath,
        threads: env.WHISPER_THREADS ? Number(env.WHISPER_THREADS) : undefined,
      });
    }

    case 'deepgram': {
      const apiKey = env.DEEPGRAM_API_KEY;
      if (!apiKey) throw new ProviderNotConfiguredError('deepgram', 'DEEPGRAM_API_KEY env var');
      return new DeepgramStt({ apiKey, model: env.DEEPGRAM_MODEL });
    }

    default:
      throw new ProviderNotConfiguredError(provider, 'STT_PROVIDER value is unrecognized');
  }
}
