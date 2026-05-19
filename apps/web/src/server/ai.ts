/**
 * Server-only AI helpers. NEVER import this from a client component — the
 * API key would get bundled into the browser. Use only from app/api/* route
 * handlers and server components.
 */
import 'server-only';
import { createLlmFromEnv } from '@hal/media';
import type { LlmProvider } from '@hal/media';

let cached: LlmProvider | null = null;

export function getLlm(): LlmProvider {
  if (!cached) {
    cached = createLlmFromEnv();
  }
  return cached;
}
