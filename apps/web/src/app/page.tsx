import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { LandingView } from '@/module/landing/views/LandingView';
import { getAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (session?.user) redirect('/app');
  return <LandingView signedIn={false} />;
}
