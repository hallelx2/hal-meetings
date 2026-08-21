import type {
  LlmProvider,
  CompleteOpts,
  ChatOpts,
  JsonCompleteOpts,
  LlmMessage,
} from './types';
import { LlmRequestFailedError, ProviderNotConfiguredError } from '../errors';

export interface GlmOptions {
  apiKey: string;
  /** e.g. 'glm-4.6', 'glm-4.5-air'. */
  model: string;
  /**
   * API base. Defaults to the international endpoint.
   *
   * Zhipu runs two estates that are not interchangeable: `api.z.ai` for
   * international keys and `open.bigmodel.cn` for mainland ones. A key issued
   * for one returns 401 against the other, which reads as "bad key" and sends
   * you looking in the wrong place — hence the explicit override.
   */
  baseUrl?: string;
  timeoutMs?: number;
  /**
   * Let the model think before answering. Off by default, and that default is
   * load-bearing — see the class comment.
   */
  thinking?: boolean;
}

interface GlmChatResponse {
  choices?: Array<{
    message?: { content?: string | null; reasoning_content?: string | null };
    finish_reason?: string;
  }>;
  error?: { message?: string; code?: string };
}

const DEFAULT_BASE_URL = 'https://api.z.ai/api/paas/v4';

/**
 * Zhipu GLM (z.ai) adapter.
 *
 * The chat API is OpenAI-shaped — `/chat/completions`, bearer auth, messages
 * in, `choices[0].message.content` out — so this is deliberately a thin
 * translation rather than an SDK dependency.
 *
 * Two GLM-specific details are worth knowing:
 *
 *   - **Thinking is on by default and it will silently eat the whole
 *     response.** Verified against the live API: `glm-4.6` asked for one word
 *     with `max_tokens: 16` returned `content: ""`, `finish_reason: "length"`
 *     and 16 reasoning tokens — the entire budget spent thinking, nothing
 *     said. Sending `thinking: {type: 'disabled'}` returned `"ok"` in two
 *     tokens. Summarisation does not need a scratchpad, so it is disabled
 *     unless asked for.
 *   - Chain of thought comes back in a separate `reasoning_content` field.
 *     Only `content` is the answer; concatenating them would put the model's
 *     private reasoning into a summary that gets emailed to the user.
 *   - `response_format: {type: 'json_object'}` is honoured (verified), which
 *     makes `jsonComplete` far more reliable than prompt-only coaxing. Fence
 *     stripping stays because "far more reliable" is not "always".
 */
export class GlmLlm implements LlmProvider {
  readonly name = 'glm';
  private readonly baseUrl: string;

  constructor(private readonly opts: GlmOptions) {
    if (!opts.apiKey) throw new ProviderNotConfiguredError('glm', 'apiKey');
    if (!opts.model) throw new ProviderNotConfiguredError('glm', 'model');
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
  }

  private async request(body: Record<string, unknown>): Promise<string> {
    const ctrl = new AbortController();
    // A meeting summary over a long transcript is a slow call; the default has
    // to outlast it or the pipeline fails at the last step having done all the
    // expensive work.
    const timeoutId = setTimeout(() => ctrl.abort(), this.opts.timeoutMs ?? 120_000);

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.opts.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });

      const text = await res.text();
      if (!res.ok) {
        // The body carries the actionable part — an invalid key and an unknown
        // model are both 4xx and need completely different fixes.
        throw new LlmRequestFailedError('glm', `HTTP ${res.status}: ${text.slice(0, 400)}`);
      }

      let parsed: GlmChatResponse;
      try {
        parsed = JSON.parse(text) as GlmChatResponse;
      } catch (e) {
        throw new LlmRequestFailedError('glm', `non-JSON response: ${text.slice(0, 200)}`, e);
      }

      if (parsed.error?.message) {
        throw new LlmRequestFailedError('glm', parsed.error.message);
      }

      const choice = parsed.choices?.[0];
      const content = choice?.message?.content;
      if (typeof content !== 'string' || !content.trim()) {
        // Name the likely cause rather than reporting a bare empty string: an
        // answer lost to the thinking budget looks identical to a refusal
        // unless the error says which one it was.
        const thought = choice?.message?.reasoning_content ? ' — the reply was spent on reasoning' : '';
        throw new LlmRequestFailedError(
          'glm',
          `empty completion (finish_reason: ${choice?.finish_reason ?? 'none'})${thought}`,
        );
      }
      return content;
    } catch (e) {
      if (e instanceof LlmRequestFailedError) throw e;
      if ((e as Error).name === 'AbortError') {
        throw new LlmRequestFailedError('glm', `request timed out after ${this.opts.timeoutMs ?? 120_000}ms`);
      }
      throw new LlmRequestFailedError('glm', (e as Error).message, e);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async complete(opts: CompleteOpts): Promise<string> {
    const messages: LlmMessage[] = [];
    if (opts.system) messages.push({ role: 'system', content: opts.system });
    messages.push({ role: 'user', content: opts.user });
    return this.chat({ messages, maxTokens: opts.maxTokens, temperature: opts.temperature });
  }

  /** The knobs every call shares, including the thinking switch. */
  private base(): Record<string, unknown> {
    return {
      model: this.opts.model,
      stream: false,
      thinking: { type: this.opts.thinking ? 'enabled' : 'disabled' },
    };
  }

  async chat(opts: ChatOpts): Promise<string> {
    return this.request({
      ...this.base(),
      messages: opts.messages,
      temperature: opts.temperature ?? 0.2,
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
    });
  }

  async jsonComplete<T = unknown>(opts: JsonCompleteOpts<T>): Promise<T> {
    const messages: LlmMessage[] = [];
    if (opts.system) messages.push({ role: 'system', content: opts.system });
    messages.push({
      role: 'user',
      content: `${opts.user}\n\nReturn ONLY valid JSON matching this shape:\n${opts.schemaDescription}\n\nDo not include code fences. Do not explain. Just the JSON.`,
    });

    const text = await this.request({
      ...this.base(),
      messages,
      temperature: opts.temperature ?? 0,
      response_format: { type: 'json_object' },
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
    });

    const cleaned = stripCodeFences(text);
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      throw new LlmRequestFailedError('glm', `model returned non-JSON: ${text.slice(0, 200)}`, e);
    }
    if (opts.validate) return opts.validate(parsed);
    return parsed as T;
  }
}

function stripCodeFences(s: string): string {
  return s.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '').trim();
}
