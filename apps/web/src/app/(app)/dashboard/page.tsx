import { requireSession } from '@/server/session';
import { loadDashboardCalendar, type CalendarState } from '@/server/dashboard';
import { DashboardView } from '@/module/dashboard/views/DashboardView';
import type { CalendarView } from '@/module/dashboard/calendar';
import { DEFAULT_TIME_ZONE, dayKeyOf, parseDayKey, type DayKey } from '@/module/dashboard/zone';
import { DEFAULT_BOT_NAME_TEMPLATE, renderBotName } from '@hal/meeting-links';

export const dynamic = 'force-dynamic';

/**
 * `?on=YYYY-MM-DD` — kept as a calendar day rather than parsed into an instant.
 * A day is what the grid is anchored on, and turning it into a `Date` here is
 * what would reintroduce an ambient timezone.
 */
function parseAnchor(raw: string | undefined, fallback: DayKey): DayKey {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return fallback;

  // `new Date(2026, 1, 31)` is not invalid — it is 3 March. Without the
  // round-trip check a malformed `on=` would land the user in a different month
  // than the URL names.
  const { year, month, day } = parseDayKey(raw);
  const probe = new Date(Date.UTC(year, month, day));
  const roundTrips =
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month &&
    probe.getUTCDate() === day;

  return roundTrips ? raw : fallback;
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

  // The calendar's own zone is only known after the sync, so the first pass
  // resolves "today" in UTC. Once the real zone is back, today is recomputed
  // from it — otherwise the highlighted cell could be a day out.
  const provisionalToday = dayKeyOf(now, DEFAULT_TIME_ZONE);
  const anchor = parseAnchor(params.on, provisionalToday);

  const calendar: CalendarState =
    session.calendar === 'needs-reconnect'
      ? { kind: 'reauth-required', message: 'Hal can no longer renew its access to your calendar.' }
      : session.userId
        ? await loadDashboardCalendar(session.userId, anchor, view)
        : { kind: 'not-connected' };

  const timeZone = calendar.kind === 'ready' ? calendar.timeZone : DEFAULT_TIME_ZONE;

  return (
    <DashboardView
      name={session.name}
      calendar={calendar}
      anchor={anchor}
      view={view}
      now={now}
      todayKey={dayKeyOf(now, timeZone)}
      timeZone={timeZone}
      // Same template and same renderer the agent uses, so the name on screen
      // is the name in the lobby. HAL_BOT_DISPLAY_NAME overrides both.
      botName={renderBotName(
        process.env.HAL_BOT_DISPLAY_NAME ?? DEFAULT_BOT_NAME_TEMPLATE,
        session.name ?? session.email.split('@')[0],
      )}
    />
  );
}
