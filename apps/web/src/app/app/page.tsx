import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { getRepos } from '@/server/hal';
import { normalizeEmail } from '@/server/google-oauth';
import { CockpitView } from '@/module/cockpit/views/CockpitView';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user?.email) redirect('/login');

  const email = normalizeEmail(session.user.email);
  const user = await getRepos().users.findByEmail(email);
  const tokens = user ? await getRepos().oauthTokens.findForUser(user.id, 'google') : [];

  return (
    <CockpitView
      email={email}
      name={session.user.name ?? user?.name ?? null}
      googleConnected={tokens.length > 0}
    />
  );
}
