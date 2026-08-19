import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { getEnvelope, getRepos } from '@/server/hal';
import { normalizeEmail } from '@/server/google-oauth';
import { enqueueJoinMeeting, parseMeetUrl } from '@/server/join-meeting';

export async function POST(request: Request) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: { url?: unknown };
  try {
    body = (await request.json()) as { url?: unknown };
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const url = typeof body.url === 'string' ? body.url : '';
  if (!parseMeetUrl(url)) {
    return NextResponse.json({ error: 'invalid_meet_url' }, { status: 400 });
  }

  const user = await getRepos().users.findByEmail(normalizeEmail(session.user.email));
  if (!user) {
    return NextResponse.json({ error: 'no_hal_user' }, { status: 404 });
  }

  const result = await enqueueJoinMeeting({
    store: getRepos(),
    envelope: getEnvelope(),
    user,
    url,
  });

  return NextResponse.json({ ok: true, meetingId: result.meetingId, jobId: result.jobId });
}
