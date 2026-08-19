import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { getRepos } from '@/server/hal';
import { disconnectGoogle, normalizeEmail } from '@/server/google-oauth';

export async function POST() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const halUser = await getRepos().users.findByEmail(normalizeEmail(session.user.email));
  if (!halUser) {
    return NextResponse.json({ error: 'no_hal_user' }, { status: 404 });
  }

  await disconnectGoogle(getRepos(), halUser.id);
  return NextResponse.json({ ok: true });
}
