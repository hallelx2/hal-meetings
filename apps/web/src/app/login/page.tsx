import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { LoginView } from '@/module/auth/views/LoginView';

export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  const params = await searchParams;
  const next = params.next?.startsWith('/') ? params.next : '/dashboard';
  if (session) redirect(next);
  return <LoginView next={next} />;
}
