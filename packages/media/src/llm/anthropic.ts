import type {
  LlmProvider,
  CompleteOpts,
  ChatOpts,
  JsonCompleteOpts,
} from './types';
import { LlmRequestFailedError, ProviderNotConfiguredError } from '../errors';

export interface AnthropicOptions {
  apiKey: string;
  /** Default model, e.g. 'claude-sonnet-4-6' or 'claude-opus-4-7'. */
  model: string;
  /** API endpoint override. */
  endpoint?: string;
  /** Anthropic API version header. Default '2023-06-01'. */
  apiVersion?: string;
  timeoutMs?: number;
}

interface AnthropicMessagesResponse {
  content?: Array<{ type: string; text?: string }>;
  stop_reason?: string;
}

/**
 * Anthropic Claude adapter. Production-quality summaries with long context
 * (good for full meeting transcripts).
 */
export class AnthropicLlm implements LlmProvider {
  readonly name = 'anthropic';
  private readonly endpoint: string;

  constructor(private readonly opts: AnthropicOptions) {
    if (!opts.apiKey) throw new ProviderNotConfiguredError('anthropic', 'apiKey');
    if (!opts.model) throw new ProviderNotConfiguredError('anthropic', 'model');
    this.endpoint = opts.endpoint ?? 'https://api.anthropic.com';
  }

  private async messagesCall(body: Record<string, unknown>): Promise<AnthropicMessagesResponse> {
    const ctrl = new AbortController();
    const timeoutId = this.opts.timeoutMs
      ? setTimeout(() => ctrl.abort(), this.opts.timeoutMs)
      : null;
    try {
      const res = await fetch(`${this.endpoint}/v1/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.opts.apiKey,
          'anthropic-version': this.opts.apiVersion ?? '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        throw new LlmRequestFailedError('anthropic', `HTTP ${res.status}: ${await res.text()}`);
      }
      return (await res.json()) as AnthropicMessagesResponse;
    } catch (e) {
      if (e instanceof LlmRequestFailedError) throw e;
      throw new LlmRequestFailedError('anthropic', (e as Error).message, e);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  async complete(opts: CompleteOpts): Promise<string> {
    const resp = await this.messagesCall({
      model: this.opts.model,
      max_tokens: opts.maxTokens ?? 2048,
      temperature: opts.temperature ?? 0.2,
      ...(opts.system ? { system: opts.system } : {}),
      messages: [{ role: 'user', content: opts.user }],
    });
    return extractText(resp);
  }

  async chat(opts: ChatOpts): Promise<string> {
    const system = opts.messages.find((m) => m.role === 'system')?.content;
    const turns = opts.messages.filter((m) => m.role !== 'system');
    const resp = await this.messagesCall({
      model: this.opts.model,
      max_tokens: opts.maxTokens ?? 2048,
      temperature: opts.temperature ?? 0.2,
      ...(system ? { system } : {}),
      messages: turns.map((m) => ({ role: m.role, content: m.content })),
    });
    return extractText(resp);
  }

  async jsonComplete<T = unknown>(opts: JsonCompleteOpts<T>): Promise<T> {
    const sys =
      (opts.system ? opts.system + '\n\n' : '') +
      `You MUST respond with ONLY valid JSON matching this shape:\n${opts.schemaDescription}\nNo prose, no code fences.`;
    const text = await this.complete({
      system: sys,
      user: opts.user,
      maxTokens: opts.maxTokens,
      temperature: opts.temperature ?? 0,
    });
    const cleaned = stripCodeFences(text);
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      throw new LlmRequestFailedError('anthropic', `model returned non-JSON: ${text.slice(0, 200)}`, e);
    }
    if (opts.validate) return opts.validate(parsed);
    return parsed as T;
  }
}

function extractText(resp: AnthropicMessagesResponse): string {
  return (resp.content ?? [])
    .filter((c) => c.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text as string)
    .join('');
}

function stripCodeFences(s: string): string {
  return s.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '').trim();
}
