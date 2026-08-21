import 'server-only';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { getRepos } from '@/server/hal';
import { hasCalendarAccess, normalizeEmail } from '@/server/google-oauth';

export type AppSession = {
  email: string;
  name: string | null;
  /** Hal's own user row. Null until the OAuth after-hook has written it. */
  userId: string | null;
  /** True only when the stored grant actually covers the calendar scopes. */
  calendarConnected: boolean;
};

/**
 * The single answer to "who is this, and where do they belong".
 *
 * One function because three copies disagree within a month, and the
 * disagreement surfaces as a redirect loop. Login, the layout and every page
 * call this one.
 *
 * Called from both the layout and each page on purpose. Layouts are preserved
 * across in-app navigation and are not reliably re-run, so a session that
 * expires while someone sits on a screen would never be re-checked. The page is
 * the authority; the layout is the coarse gate.
 */
export async function requireSession(): Promise<AppSession> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user?.email) redirect('/login');

  const email = normalizeEmail(session.user.email);
  const user = await getRepos().users.findByEmail(email);
  const tokens = user ? await getRepos().oauthTokens.findForUser(user.id, 'google') : [];

  return {
    email,
    name: session.user.name ?? user?.name ?? null,
    userId: user?.id ?? null,
    calendarConnected: tokens.some((token) => hasCalendarAccess(token.scopes ?? [])),
  };
}
