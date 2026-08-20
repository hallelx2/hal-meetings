/**
 * Google OAuth scopes, split by what they are for.
 *
 * Lives in `lib/` rather than `server/` because the connect button is a client
 * component and needs the calendar list to request it. Nothing here touches the
 * database, the envelope service, or any secret — it is a list of strings, safe
 * on both sides of the boundary.
 */

/**
 * What signing in asks for: who you are, nothing else.
 *
 * Authentication and authorisation are deliberately separate. A first-time
 * visitor should not be asked for their calendar before they have seen what
 * Hal does with it — the consent screen is the heaviest drop-off in the funnel,
 * and asking for everything at once is what makes it heavy.
 */
export const IDENTITY_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
] as const;

/** What "Connect Google Calendar" asks for, once the user chooses to. */
export const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
] as const;

/**
 * The full grant the explicit Calendar connection flow requests.
 *
 * Deliberately NOT the fallback for a missing `scope` — see
 * {@link resolveGrantedScopes}.
 */
export const GOOGLE_SCOPES = [...IDENTITY_SCOPES, ...CALENDAR_SCOPES] as const;

/**
 * Turn a provider's raw `scope` string into the list we store.
 *
 * One function because there is one rule, and the rule is easy to get
 * backwards: when Google tells us nothing, assume the *least* access, not the
 * most. Recording calendar access we do not have makes `hasCalendarAccess()`
 * lie, hides the connect prompt, and leaves the user with a sync that fails
 * silently and no control that fixes it. Under-claiming costs one extra click;
 * over-claiming strands them.
 */
export function resolveGrantedScopes(raw: string | null | undefined): string[] {
  const parsed = (raw ?? '').split(/[,\s]+/).filter(Boolean);
  return parsed.length > 0 ? parsed : [...IDENTITY_SCOPES];
}

/**
 * Is Calendar actually connected?
 *
 * Not "does a Google account exist" — every signed-in user has one of those
 * now that sign-in itself links Google. The question is whether the stored
 * grant covers the calendar scopes, which is the only thing that determines
 * whether a sync can succeed.
 */
export function hasCalendarAccess(scopes: readonly string[]): boolean {
  const granted = new Set(scopes);
  return CALENDAR_SCOPES.every((scope) => granted.has(scope));
}
