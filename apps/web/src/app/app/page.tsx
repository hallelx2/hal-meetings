import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { getRepos } from '@/server/hal';
import { hasCalendarAccess, normalizeEmail } from '@/server/google-oauth';
import { CockpitView } from '@/module/cockpit/views/CockpitView';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user?.email) redirect('/login');

  const email = normalizeEmail(session.user.email);
  const user = await getRepos().users.findByEmail(email);
  const tokens = user ? await getRepos().oauthTokens.findForUser(user.id, 'google') : [];

  // "Connected" means the stored grant actually covers Calendar. Every signed-in
  // user has a Google token now that sign-in links Google, so the presence of a
  // row says nothing about whether a sync can succeed.
  const calendarConnected = tokens.some((token) => hasCalendarAccess(token.scopes ?? []));

  return (
    <CockpitView
      email={email}
      name={session.user.name ?? user?.name ?? null}
      googleConnected={calendarConnected}
    />
  );
}
