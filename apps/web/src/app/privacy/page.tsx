import { headers } from 'next/headers';
import { PrivacyView } from '@/module/legal/views/PrivacyView';
import { getAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  return <PrivacyView signedIn={Boolean(session?.user)} email={session?.user?.email ?? null} />;
}
