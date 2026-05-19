import type {
  LlmProvider,
  CompleteOpts,
  ChatOpts,
  JsonCompleteOpts,
  LlmMessage,
} from './types';
import { LlmRequestFailedError, ProviderNotConfiguredError } from '../errors';

export interface OllamaOptions {
  /** Endpoint, default http://localhost:11434 */
  endpoint?: string;
  /** Default model, e.g. 'llama3.2', 'qwen2.5'. */
  model: string;
  /** Request timeout in ms. */
  timeoutMs?: number;
}

interface OllamaChatResponse {
  message?: { content: string };
  done?: boolean;
  total_duration?: number;
}

/**
 * Local Ollama adapter. Use for the air-gapped tier where no audio or text
 * may leave the box. Latency depends on host hardware — quality is lower
 * than Claude/GPT-4 but adequate for summaries.
 */
export class OllamaLlm implements LlmProvider {
  readonly name = 'ollama';
  private readonly endpoint: string;

  constructor(private readonly opts: OllamaOptions) {
    if (!opts.model) throw new ProviderNotConfiguredError('ollama', 'model');
    this.endpoint = opts.endpoint ?? 'http://localhost:11434';
  }

  private async request<T>(path: string, body: unknown): Promise<T> {
    const ctrl = new AbortController();
    const timeoutId = this.opts.timeoutMs
      ? setTimeout(() => ctrl.abort(), this.opts.timeoutMs)
      : null;
    try {
      const res = await fetch(`${this.endpoint}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        throw new LlmRequestFailedError('ollama', `HTTP ${res.status}: ${await res.text()}`);
      }
      return (await res.json()) as T;
    } catch (e) {
      if (e instanceof LlmRequestFailedError) throw e;
      throw new LlmRequestFailedError('ollama', (e as Error).message, e);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  async complete(opts: CompleteOpts): Promise<string> {
    const messages: LlmMessage[] = [];
    if (opts.system) messages.push({ role: 'system', content: opts.system });
    messages.push({ role: 'user', content: opts.user });
    return this.chat({ messages, maxTokens: opts.maxTokens, temperature: opts.temperature });
  }

  async chat(opts: ChatOpts): Promise<string> {
    const resp = await this.request<OllamaChatResponse>('/api/chat', {
      model: this.opts.model,
      messages: opts.messages,
      stream: false,
      options: {
        num_predict: opts.maxTokens,
        temperature: opts.temperature ?? 0.2,
      },
    });
    return resp.message?.content ?? '';
  }

  async jsonComplete<T = unknown>(opts: JsonCompleteOpts<T>): Promise<T> {
    const augmented = `${opts.user}\n\nReturn ONLY valid JSON matching this shape:\n${opts.schemaDescription}\n\nDo not include code fences. Do not explain. Just the JSON.`;
    const text = await this.complete({
      system: opts.system,
      user: augmented,
      maxTokens: opts.maxTokens,
      temperature: opts.temperature ?? 0,
    });
    const cleaned = stripCodeFences(text);
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      throw new LlmRequestFailedError('ollama', `model returned non-JSON: ${text.slice(0, 200)}`, e);
    }
    if (opts.validate) return opts.validate(parsed);
    return parsed as T;
  }
}

function stripCodeFences(s: string): string {
  return s.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '').trim();
}
