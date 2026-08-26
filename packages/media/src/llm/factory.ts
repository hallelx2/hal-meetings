import type { LlmProvider } from './types';
import { OllamaLlm } from './ollama';
import { AnthropicLlm } from './anthropic';
import { GeminiLlm } from './gemini';
import { GlmLlm } from './glm';
import { ProviderNotConfiguredError } from '../errors';

export type LlmProviderName = 'ollama' | 'anthropic' | 'gemini' | 'glm';

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
  // glm (z.ai / Zhipu)
  GLM_API_KEY?: string;
  GLM_MODEL?: string;
  GLM_BASE_URL?: string;
  /** Opt in to the model's reasoning pass. Off by default — see GlmLlm. */
  GLM_THINKING?: string;
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

    case 'glm': {
      const apiKey = env.GLM_API_KEY;
      if (!apiKey) throw new ProviderNotConfiguredError('glm', 'GLM_API_KEY env var');
      // glm-4.7-flash is free and current-generation; summarising a transcript
      // is well inside what it does. GLM_MODEL=glm-5.3 buys the flagship.
      const model = env.GLM_MODEL ?? 'glm-4.7-flash';
      return new GlmLlm({
        apiKey,
        model,
        baseUrl: env.GLM_BASE_URL,
        thinking: env.GLM_THINKING === 'true',
      });
    }

    default:
      throw new ProviderNotConfiguredError(provider, 'LLM_PROVIDER value is unrecognized');
  }
}
