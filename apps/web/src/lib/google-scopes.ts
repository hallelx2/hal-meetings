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

/**
 * What the UI is allowed to say about Calendar.
 *
 * `hasCalendarAccess` answers *was the calendar ever granted*. The sync needs a
 * different question answered: *can I get a token right now*. Those diverge the
 * moment a refresh token goes missing — Google keeps reporting the full
 * accumulated grant via `include_granted_scopes`, so the scopes still look
 * perfect while nothing can actually be fetched.
 *
 * Left as two separate checks, the sidebar said "Calendar on" while the page
 * beside it said "Calendar disconnected". One function, so they cannot disagree.
 */
export type CalendarConnection = 'connected' | 'needs-reconnect' | 'not-connected';

export function calendarConnection(
  tokens: ReadonlyArray<{ scopes?: readonly string[] | null; refreshTokenCt?: unknown }>,
): CalendarConnection {
  const granted = tokens.filter((token) => hasCalendarAccess(token.scopes ?? []));
  if (granted.length === 0) return 'not-connected';
  // Only a token that can be renewed is worth calling connected.
  return granted.some((token) => token.refreshTokenCt != null)
    ? 'connected'
    : 'needs-reconnect';
}
