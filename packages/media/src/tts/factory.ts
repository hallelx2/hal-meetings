import type { TtsProvider } from './types';
import { PiperTts } from './piper';
import { ElevenLabsTts } from './elevenlabs';
import { ProviderNotConfiguredError } from '../errors';

export type TtsProviderName = 'piper' | 'elevenlabs';

export interface TtsFactoryEnv {
  TTS_PROVIDER?: string;
  PIPER_BINARY?: string;
  PIPER_MODEL?: string;
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_VOICE_ID?: string;
}

export function createTtsFromEnv(env: TtsFactoryEnv = process.env as TtsFactoryEnv): TtsProvider {
  const provider = (env.TTS_PROVIDER ?? 'piper') as TtsProviderName;

  switch (provider) {
    case 'piper': {
      const binaryPath = env.PIPER_BINARY;
      const modelPath = env.PIPER_MODEL;
      if (!binaryPath || !modelPath) {
        throw new ProviderNotConfiguredError('piper', 'PIPER_BINARY and PIPER_MODEL env vars');
      }
      return new PiperTts({ binaryPath, modelPath });
    }
    case 'elevenlabs': {
      const apiKey = env.ELEVENLABS_API_KEY;
      if (!apiKey) throw new ProviderNotConfiguredError('elevenlabs', 'ELEVENLABS_API_KEY env var');
      return new ElevenLabsTts({ apiKey, defaultVoiceId: env.ELEVENLABS_VOICE_ID });
    }
    default:
      throw new ProviderNotConfiguredError(provider, 'TTS_PROVIDER value is unrecognized');
  }
}
