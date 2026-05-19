/**
 * Generic LLM interface used by Hal's summarizer. Three operations:
 *   - complete: single-turn text completion
 *   - chat: structured conversation
 *   - jsonComplete: forced-JSON output for structured summaries
 */

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompleteOpts {
  /** System prompt. */
  system?: string;
  /** User prompt. */
  user: string;
  /** Max output tokens. */
  maxTokens?: number;
  /** Sampling temperature 0..1. */
  temperature?: number;
}

export interface ChatOpts {
  messages: LlmMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface JsonCompleteOpts<T> extends CompleteOpts {
  /** A JSON schema (loose — we just describe to the prompt). */
  schemaDescription: string;
  /** Validator that returns a parsed value or throws. Optional. */
  validate?: (raw: unknown) => T;
}

export interface LlmProvider {
  readonly name: string;
  /** Free-form text completion. */
  complete(opts: CompleteOpts): Promise<string>;
  /** Conversational completion. */
  chat(opts: ChatOpts): Promise<string>;
  /** Output parsed JSON. Implementations should re-prompt on parse errors. */
  jsonComplete<T = unknown>(opts: JsonCompleteOpts<T>): Promise<T>;
}
