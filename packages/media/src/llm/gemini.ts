import type {
  LlmProvider,
  CompleteOpts,
  ChatOpts,
  JsonCompleteOpts,
} from './types';
import { LlmRequestFailedError, ProviderNotConfiguredError } from '../errors';

export interface GeminiOptions {
  apiKey: string;
  /** Default model. e.g. 'gemini-2.0-flash', 'gemini-2.5-pro'. */
  model: string;
  endpoint?: string;
  timeoutMs?: number;
}

interface GeminiContent {
  role: 'user' | 'model' | 'system';
  parts: Array<{ text: string }>;
}

interface GeminiRequestBody {
  contents: GeminiContent[];
  systemInstruction?: { parts: Array<{ text: string }> };
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
}

/**
 * Google Gemini adapter via the v1beta generateContent endpoint.
 * https://ai.google.dev/api/generate-content
 *
 * Notes:
 *   - "system" turns are folded into systemInstruction (Gemini doesn't accept
 *     a system role inside contents).
 *   - For jsonComplete we set responseMimeType='application/json' which forces
 *     valid JSON output — much more reliable than prompting for it.
 *   - Keep this strictly server-side; never bundle the API key into a browser.
 */
export class GeminiLlm implements LlmProvider {
  readonly name = 'gemini';
  private readonly endpoint: string;

  constructor(private readonly opts: GeminiOptions) {
    if (!opts.apiKey) throw new ProviderNotConfiguredError('gemini', 'apiKey');
    if (!opts.model) throw new ProviderNotConfiguredError('gemini', 'model');
    this.endpoint = opts.endpoint ?? 'https://generativelanguage.googleapis.com/v1beta';
  }

  private async generateContent(body: GeminiRequestBody): Promise<string> {
    const url = `${this.endpoint}/models/${encodeURIComponent(this.opts.model)}:generateContent?key=${encodeURIComponent(this.opts.apiKey)}`;
    const ctrl = new AbortController();
    const timeoutId = this.opts.timeoutMs
      ? setTimeout(() => ctrl.abort(), this.opts.timeoutMs)
      : null;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        throw new LlmRequestFailedError('gemini', `HTTP ${res.status}: ${await res.text()}`);
      }
      const json = (await res.json()) as GeminiResponse;
      if (json.promptFeedback?.blockReason) {
        throw new LlmRequestFailedError(
          'gemini',
          `prompt blocked: ${json.promptFeedback.blockReason}`,
        );
      }
      const text = json.candidates
        ?.flatMap((c) => c.content?.parts ?? [])
        .map((p) => p.text ?? '')
        .join('');
      return text ?? '';
    } catch (e) {
      if (e instanceof LlmRequestFailedError) throw e;
      throw new LlmRequestFailedError('gemini', (e as Error).message, e);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  async complete(opts: CompleteOpts): Promise<string> {
    return this.generateContent({
      contents: [{ role: 'user', parts: [{ text: opts.user }] }],
      ...(opts.system
        ? { systemInstruction: { parts: [{ text: opts.system }] } }
        : {}),
      generationConfig: {
        temperature: opts.temperature ?? 0.2,
        maxOutputTokens: opts.maxTokens ?? 2048,
      },
    });
  }

  async chat(opts: ChatOpts): Promise<string> {
    const system = opts.messages.find((m) => m.role === 'system')?.content;
    const turns = opts.messages.filter((m) => m.role !== 'system');
    const contents: GeminiContent[] = turns.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    return this.generateContent({
      contents,
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      generationConfig: {
        temperature: opts.temperature ?? 0.2,
        maxOutputTokens: opts.maxTokens ?? 2048,
      },
    });
  }

  async jsonComplete<T = unknown>(opts: JsonCompleteOpts<T>): Promise<T> {
    const text = await this.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${opts.user}\n\nReturn JSON matching this shape:\n${opts.schemaDescription}`,
            },
          ],
        },
      ],
      ...(opts.system
        ? { systemInstruction: { parts: [{ text: opts.system }] } }
        : {}),
      generationConfig: {
        temperature: opts.temperature ?? 0,
        maxOutputTokens: opts.maxTokens ?? 2048,
        responseMimeType: 'application/json',
      },
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripCodeFences(text));
    } catch (e) {
      throw new LlmRequestFailedError('gemini', `non-JSON response: ${text.slice(0, 200)}`, e);
    }
    if (opts.validate) return opts.validate(parsed);
    return parsed as T;
  }
}

function stripCodeFences(s: string): string {
  return s.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '').trim();
}
