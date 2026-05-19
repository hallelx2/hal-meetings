import type { LlmProvider } from './types';
import { OllamaLlm } from './ollama';
import { AnthropicLlm } from './anthropic';
import { GeminiLlm } from './gemini';
import { ProviderNotConfiguredError } from '../errors';

export type LlmProviderName = 'ollama' | 'anthropic' | 'gemini';

export interface LlmFactoryEnv {
  LLM_PROVIDER?: string;
  // ollama
  OLLAMA_ENDPOINT?: string;
  OLLAMA_MODEL?: string;
  // anthropic
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  // gemini
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
}

export function createLlmFromEnv(env: LlmFactoryEnv = process.env as LlmFactoryEnv): LlmProvider {
  const provider = (env.LLM_PROVIDER ?? 'ollama') as LlmProviderName;

  switch (provider) {
    case 'ollama': {
      const model = env.OLLAMA_MODEL;
      if (!model) throw new ProviderNotConfiguredError('ollama', 'OLLAMA_MODEL env var');
      return new OllamaLlm({ model, endpoint: env.OLLAMA_ENDPOINT });
    }

    case 'anthropic': {
      const apiKey = env.ANTHROPIC_API_KEY;
      const model = env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
      if (!apiKey) throw new ProviderNotConfiguredError('anthropic', 'ANTHROPIC_API_KEY env var');
      return new AnthropicLlm({ apiKey, model });
    }

    case 'gemini': {
      const apiKey = env.GEMINI_API_KEY;
      const model = env.GEMINI_MODEL ?? 'gemini-2.0-flash';
      if (!apiKey) throw new ProviderNotConfiguredError('gemini', 'GEMINI_API_KEY env var');
      return new GeminiLlm({ apiKey, model });
    }

    default:
      throw new ProviderNotConfiguredError(provider, 'LLM_PROVIDER value is unrecognized');
  }
}
