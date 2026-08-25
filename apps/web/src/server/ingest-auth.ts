import 'server-only';

import { timingSafeEqual } from 'node:crypto';

/**
 * Authentication for machine callers, which cannot hold a session cookie.
 *
 * A shared secret rather than a per-user API key table. That is the honest
 * shape for a self-hosted single-operator deployment, and pretending otherwise
 * would mean a schema, a key-rotation UI and a revocation story for a feature
 * with exactly one user. When Hal serves more than one person this has to
 * become a real key per user — noted here so the limit is visible rather than
 * discovered.
 *
 * The token identifies *the deployment*, not a person, so the acting user is
 * configured alongside it. A token that could name its own user would let
 * anyone holding it act as anyone.
 */
export type IngestIdentity = { email: string };

export class IngestNotConfiguredError extends Error {
  constructor() {
    super('ingest is not configured on this deployment');
    this.name = 'IngestNotConfiguredError';
  }
}

/**
 * Constant-time comparison.
 *
 * `===` on a secret leaks its length and its matching prefix through timing,
 * which is a real attack against a token an attacker can guess at repeatedly.
 * The length check first is unavoidable — `timingSafeEqual` throws on a length
 * mismatch — and leaks only the length, which is fixed and public anyway.
 */
function secretsMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Who is this caller, if anyone.
 *
 * Returns null for a bad or missing token. Throws only when the deployment has
 * not been configured for ingest at all — that is an operator error worth
 * distinguishing from a rejected caller, because the fixes are different.
 */
export function identifyIngestCaller(authorization: string | null): IngestIdentity | null {
  const expected = process.env.HAL_INGEST_TOKEN;
  const email = process.env.HAL_INGEST_USER_EMAIL;

  // Refuse to run with a short token rather than pretending to be protected.
  // 32 characters is not a policy so much as a floor below which the secret is
  // guessable, and a guessable ingest token means anyone can send Hal into a
  // meeting on the operator's behalf.
  if (!expected || expected.length < 32 || !email) throw new IngestNotConfiguredError();

  const presented = (authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!presented) return null;

  return secretsMatch(presented, expected) ? { email } : null;
}
