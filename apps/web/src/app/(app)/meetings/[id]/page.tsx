import { notFound } from 'next/navigation';
import { requireSession } from '@/server/session';
import { loadMeeting } from '@/server/meeting';
import { MeetingView } from '@/module/meetings/views/MeetingView';
import { DEFAULT_TIME_ZONE } from '@/module/dashboard/zone';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  if (!session.userId) notFound();

  const load = await loadMeeting(id, session.userId);
  // `loadMeeting` returns not-found for a meeting outside the caller's
  // workspace as well as one that does not exist. Telling a stranger that an
  // id is real is itself a disclosure.
  if (load.kind !== 'ready') notFound();

  return <MeetingView meeting={load.meeting} timeZone={DEFAULT_TIME_ZONE} />;
}
