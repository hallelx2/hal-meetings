import { requireSession } from '@/server/session';
import { loadDashboardWeek, type CalendarState } from '@/server/dashboard';
import { DashboardView } from '@/module/dashboard/views/DashboardView';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await requireSession();
  const now = new Date();

  const calendar: CalendarState = session.userId
    ? await loadDashboardWeek(session.userId, now)
    : { kind: 'not-connected' };

  return (
    <DashboardView
      name={session.name}
      calendar={calendar}
      now={now}
    />
  );
}
