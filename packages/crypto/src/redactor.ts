/**
 * Token + secret redactors for structured loggers. Use these patterns to
 * configure your logger's redaction list so we never spill OAuth tokens,
 * KMS material, or session secrets to stdout.
 *
 * For pino: pass `paths` into the `redact` option.
 * For pretty logs: call `redactString()` directly on the formatted line.
 */

/**
 * Object paths to redact in structured log lines. Pino-compatible (supports
 * `*` wildcards).
 */
export const STRUCTURED_REDACT_PATHS = [
  // direct secret fields
  '*.access_token',
  '*.accessToken',
  '*.refresh_token',
  '*.refreshToken',
  '*.token',
  '*.password',
  '*.secret',
  '*.api_key',
  '*.apiKey',
  // OAuth + KMS specific
  '*.dek',
  '*.dek_wrapped',
  '*.dekWrapped',
  '*.client_secret',
  '*.clientSecret',
  // headers
  'req.headers.authorization',
  'res.headers["set-cookie"]',
  '*.headers.authorization',
  // nested under typical shapes
  '*.credentials.*',
  '*.oauth.*',
] as const;

/**
 * Regex patterns that match common token shapes. Use these to scrub
 * already-formatted text (e.g. error messages, raw HTTP traces).
 *
 * Each pattern is conservative — better false-positives than leaks.
 */
const TOKEN_PATTERNS: ReadonlyArray<[RegExp, string]> = [
  // Bearer / token-like headers
  [/Bearer\s+[A-Za-z0-9._\-+/=]{16,}/g, 'Bearer <redacted>'],
  [/[Aa]uthorization:\s*\S+/g, 'Authorization: <redacted>'],

  // Google OAuth-y access tokens
  [/ya29\.[A-Za-z0-9._\-]{20,}/g, '<google-access-token-redacted>'],

  // JWTs (3 dot-separated base64url segments, lenient length)
  [/eyJ[A-Za-z0-9_\-]{6,}\.[A-Za-z0-9_\-]{6,}\.[A-Za-z0-9_\-]{6,}/g, '<jwt-redacted>'],

  // Zoom SDK JWT-shaped or hex secrets > 32 chars in key=value form
  [/(zoom_sdk_secret|zoom_secret)["\s:=]+[A-Za-z0-9._\-+/=]{16,}/gi, '$1=<redacted>'],

  // generic api_key / secret / password = ...
  [/(api[_-]?key|password|secret|client[_-]?secret)\s*[:=]\s*["']?[A-Za-z0-9._\-+/=]{8,}["']?/gi, '$1=<redacted>'],

  // hex blobs over 32 chars (DEKs, master keys, etc.)
  [/\b[a-fA-F0-9]{64,}\b/g, '<hex-blob-redacted>'],
];

export function redactString(s: string): string {
  let out = s;
  for (const [pattern, replacement] of TOKEN_PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/**
 * Recursively redact a structured value. Useful if your logger doesn't have
 * built-in path-based redaction.
 */
export function redactDeep<T>(value: T, depth = 0): T {
  if (depth > 12) return value;
  if (value == null) return value;

  if (typeof value === 'string') {
    return redactString(value) as unknown as T;
  }

  if (value instanceof Uint8Array || value instanceof ArrayBuffer || Buffer.isBuffer(value as unknown)) {
    return '<bytes-redacted>' as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((v) => redactDeep(v, depth + 1)) as unknown as T;
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const key = k.toLowerCase();
      if (
        key.includes('token') ||
        key.includes('password') ||
        key.includes('secret') ||
        key.includes('api_key') ||
        key.includes('apikey') ||
        key === 'dek' ||
        key === 'dekwrapped' ||
        key === 'dek_wrapped' ||
        key === 'credentials'
      ) {
        out[k] = '<redacted>';
      } else {
        out[k] = redactDeep(v, depth + 1);
      }
    }
    return out as unknown as T;
  }

  return value;
}
