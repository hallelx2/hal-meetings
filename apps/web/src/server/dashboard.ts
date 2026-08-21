import 'server-only';

import { getEnvelope, getRepos } from '@/server/hal';
import {
  CalendarNotConnectedError,
  CalendarReauthRequiredError,
  syncCalendarWindow,
} from '@/server/google-calendar';
import { cellCount, firstCellKey, type CalendarEntry, type CalendarView } from '@/module/dashboard/calendar';
import {
  DEFAULT_TIME_ZONE,
  addDaysToKey,
  startOfDayInstant,
  type DayKey,
} from '@/module/dashboard/zone';

export type CalendarState =
  | { kind: 'not-connected' }
  | { kind: 'reauth-required'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; entries: CalendarEntry[]; timeZone: string };

/**
 * Everything the dashboard needs for the period on screen.
 *
 * The synced window follows the view rather than being a fixed week — a month
 * grid shows days either side of the month, and those events are real events
 * the user expects to see. Fetching less leaves visibly empty rows.
 *
 * Syncs on read. A push subscription (Calendar watch + webhook) is the right
 * long-term answer and is out of scope here — sync-on-view means the screen is
 * never stale when someone is actually looking at it, which is the case that
 * matters while this is one person's cockpit.
 */
export async function loadDashboardCalendar(
  userId: string,
  anchor: DayKey,
  view: CalendarView,
  fallbackZone: string = DEFAULT_TIME_ZONE,
): Promise<CalendarState> {
  const repos = getRepos();
  const user = await repos.users.findById(userId);
  if (!user) return { kind: 'not-connected' };

  const workspace = await repos.workspaces.findForUser(userId);
  if (!workspace) return { kind: 'not-connected' };

  // The window has to be resolved in *some* zone before the first fetch, and
  // the calendar's own zone is only known after it. Widening by a day either
  // side covers the largest possible offset, so nothing visible is missed
  // whichever zone turns out to apply.
  const first = firstCellKey(anchor, view);
  const last = addDaysToKey(first, cellCount(view));
  const from = startOfDayInstant(addDaysToKey(first, -1), fallbackZone);
  const to = startOfDayInstant(addDaysToKey(last, 1), fallbackZone);

  try {
    const { events, timeZone } = await syncCalendarWindow(
      { store: repos, envelope: getEnvelope(), user, workspaceId: workspace.id },
      { from, to },
    );

    // Meetings Hal has a row for, so the calendar can show real status rather
    // than only what the calendar itself knows.
    const known = await repos.meetings.listInWindow({ userId, from, to });
    const byEventId = new Map(
      known.filter((m) => m.externalEventId).map((m) => [m.externalEventId!, m]),
    );

    const entries: CalendarEntry[] = events.map((meeting) => {
      const row = byEventId.get(meeting.event.id);
      return {
        id: meeting.event.id,
        title: meeting.event.summary?.trim() || 'Untitled meeting',
        start: meeting.start,
        end: meeting.end,
        platform: meeting.conferencing?.platform ?? null,
        url: meeting.conferencing?.url ?? null,
        joinable: meeting.conferencing?.joinable ?? false,
        status: row?.status ?? null,
        policy: row?.policy ?? null,
        description: meeting.event.description?.trim() || null,
        location: meeting.event.location?.trim() || null,
        organizer:
          meeting.event.organizer?.displayName?.trim() ||
          meeting.event.organizer?.email?.trim() ||
          null,
        attendees: (meeting.event.attendees ?? [])
          .filter((a) => a?.email)
          .map((a) => ({
            email: a.email!,
            response: a.responseStatus ?? null,
            isSelf: a.self === true,
          })),
        htmlLink: meeting.event.htmlLink ?? null,
      };
    });

    return { kind: 'ready', entries, timeZone: timeZone ?? fallbackZone };
  } catch (error) {
    if (error instanceof CalendarNotConnectedError) return { kind: 'not-connected' };
    if (error instanceof CalendarReauthRequiredError) {
      return { kind: 'reauth-required', message: error.message };
    }
    // Never let a Google outage take the dashboard down with it — the
    // paste-a-Meet-URL path still works and the user should still reach it.
    console.error('calendar sync failed', error);
    return {
      kind: 'error',
      message: 'Could not reach Google Calendar just now.',
    };
  }
}
