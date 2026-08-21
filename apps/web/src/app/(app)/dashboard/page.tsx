import { requireSession } from '@/server/session';
import { loadDashboardWeek, type CalendarState } from '@/server/dashboard';
import { DashboardView } from '@/module/dashboard/views/DashboardView';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await requireSession();
  const now = new Date();

  // A grant that cannot be renewed will fail every sync, so say so directly
  // rather than spending a round trip to Google to be told the same thing.
  const calendar: CalendarState =
    session.calendar === 'needs-reconnect'
      ? { kind: 'reauth-required', message: 'Hal can no longer renew its access to your calendar.' }
      : session.userId
        ? await loadDashboardWeek(session.userId, now)
        : { kind: 'not-connected' };

  return <DashboardView name={session.name} calendar={calendar} now={now} />;
}
