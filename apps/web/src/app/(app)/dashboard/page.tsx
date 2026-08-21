import { requireSession } from '@/server/session';
import { loadDashboardCalendar, type CalendarState } from '@/server/dashboard';
import { DashboardView } from '@/module/dashboard/views/DashboardView';
import type { CalendarView } from '@/module/dashboard/calendar';

export const dynamic = 'force-dynamic';

/**
 * `?on=YYYY-MM-DD` — parsed as local midnight rather than through `new Date()`,
 * which reads a bare date string as UTC and lands on the previous day for
 * anyone west of Greenwich.
 */
function parseAnchor(raw: string | undefined, fallback: Date): Date {
  if (!raw) return fallback;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return fallback;
  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; on?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;

  const now = new Date();
  const view: CalendarView = params.view === 'week' ? 'week' : 'month';
  const anchor = parseAnchor(params.on, now);

  // A grant that cannot be renewed will fail every sync, so say so directly
  // rather than spending a round trip to Google to be told the same thing.
  const calendar: CalendarState =
    session.calendar === 'needs-reconnect'
      ? { kind: 'reauth-required', message: 'Hal can no longer renew its access to your calendar.' }
      : session.userId
        ? await loadDashboardCalendar(session.userId, anchor, view)
        : { kind: 'not-connected' };

  return (
    <DashboardView
      name={session.name}
      calendar={calendar}
      anchor={anchor}
      view={view}
      now={now}
    />
  );
}
