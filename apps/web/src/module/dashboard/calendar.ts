/**
 * Calendar grid maths, in an explicit timezone.
 *
 * The grid is built from **calendar days**, not from instants, because that is
 * what it displays. An instant only becomes a day once you say in which zone —
 * and leaving that implicit is how the same event rendered 17:00 on the server
 * and 18:00 in the browser, and could land in two different cells.
 */

import {
  addDaysToKey,
  dayKeyOf,
  makeDayKey,
  parseDayKey,
  weekdayOfKey,
  type DayKey,
} from '@/module/dashboard/zone';

export type Attendee = {
  email: string;
  /** Google's response status: accepted | declined | tentative | needsAction. */
  response: string | null;
  isSelf: boolean;
};

export type CalendarEntry = {
  id: string;
  title: string;
  start: Date;
  end: Date | null;
  platform: 'meet' | 'zoom' | 'teams' | null;
  url: string | null;
  joinable: boolean;
  /** Set once Hal has a meetings row for this event. */
  status?: string | null;
  policy?: string | null;
  /** The agent's own words when a run failed. Never paraphrased for display. */
  failureReason?: string | null;
  /** Detail, for the panel. */
  description?: string | null;
  location?: string | null;
  organizer?: string | null;
  attendees?: Attendee[];
  /** The event's own page on Google Calendar. */
  htmlLink?: string | null;
};

export type CalendarView = 'month' | 'week';

export type DayCell = {
  key: DayKey;
  /** Day of month, for the cell label. */
  dayOfMonth: number;
  /** False for the leading/trailing days borrowed from the neighbouring month. */
  inPeriod: boolean;
  isToday: boolean;
  entries: CalendarEntry[];
};

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** Minutes between start and end.
 *
 * `null` means "no duration to show" and covers two different things: an event
 * with no end time at all, and one whose end precedes its start — corrupt data
 * from which no honest number can be derived.
 *
 * A zero-length event is **0, not null**. Google allows them and they are a
 * real point in time; reporting nothing would imply the end time is missing
 * when it is present and equal.
 */
export function durationMinutes(entry: CalendarEntry): number | null {
  if (!entry.end) return null;
  const span = entry.end.getTime() - entry.start.getTime();
  if (span < 0) return null;
  return Math.round(span / 60_000);
}

/** "1h 30m", "45m", or null. */
export function formatDuration(minutes: number | null): string | null {
  if (minutes === null) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

/** Monday-first, because the working week is what this screen is about. */
export function startOfWeekKey(key: DayKey): DayKey {
  return addDaysToKey(key, -weekdayOfKey(key));
}

export function startOfMonthKey(key: DayKey): DayKey {
  const { year, month } = parseDayKey(key);
  return makeDayKey(year, month, 1);
}

/** Shift by whole months, anchored to the 1st so a long month cannot overflow. */
export function addMonthsToKey(key: DayKey, months: number): DayKey {
  const { year, month } = parseDayKey(key);
  const shifted = new Date(Date.UTC(year, month + months, 1));
  return makeDayKey(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1);
}

/** How many day cells the view shows. Six rows for a month, fixed. */
export function cellCount(view: CalendarView): number {
  return view === 'week' ? 7 : 42;
}

/** The first day cell on screen. */
export function firstCellKey(anchor: DayKey, view: CalendarView): DayKey {
  return view === 'week' ? startOfWeekKey(anchor) : startOfWeekKey(startOfMonthKey(anchor));
}

/**
 * Bucket entries into the cells of the visible grid.
 *
 * Membership is decided by the entry's calendar day **in the display zone**,
 * never by `getDate()` — which would answer in whatever zone the code happens
 * to be running in and file a late-evening meeting under the wrong date.
 */
export function buildGrid(
  anchor: DayKey,
  todayKey: DayKey,
  view: CalendarView,
  entries: CalendarEntry[],
  timeZone: string,
): DayCell[] {
  const first = firstCellKey(anchor, view);
  const anchorMonth = parseDayKey(anchor).month;

  const byDay = new Map<DayKey, CalendarEntry[]>();
  for (const entry of entries) {
    const key = dayKeyOf(entry.start, timeZone);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(entry);
    else byDay.set(key, [entry]);
  }

  return Array.from({ length: cellCount(view) }, (_, offset) => {
    const key = addDaysToKey(first, offset);
    const { month, day } = parseDayKey(key);
    return {
      key,
      dayOfMonth: day,
      inPeriod: view === 'week' ? true : month === anchorMonth,
      isToday: key === todayKey,
      entries: (byDay.get(key) ?? []).sort((a, b) => a.start.getTime() - b.start.getTime()),
    };
  });
}

/** Anything happening right now. Instant comparison, so zone-independent. */
export function isLive(entry: CalendarEntry, now: Date): boolean {
  if (entry.end && entry.end.getTime() <= now.getTime()) return false;
  const sinceStart = now.getTime() - entry.start.getTime();
  if (sinceStart < 0) return false;
  // With no end time, an hour is the window — otherwise a meeting stays pinned
  // as "live" for the rest of the day.
  return entry.end ? true : sinceStart < 60 * 60 * 1000;
}

/**
 * Is this meeting over?
 *
 * The same assumption `isLive` makes about an endless meeting — an hour — so
 * the two can never disagree about a meeting that is neither live nor ended.
 * A meeting that has not started yet is not ended.
 */
export function hasEnded(entry: CalendarEntry, now: Date): boolean {
  if (entry.end) return entry.end.getTime() <= now.getTime();
  return now.getTime() - entry.start.getTime() >= 60 * 60 * 1000;
}

export type PeriodStats = {
  total: number;
  joinable: number;
  unsupported: number;
  /** Scheduled hours, rounded to one decimal. Events with no end are skipped. */
  hours: number;
};

/**
 * Totals for the period on screen.
 *
 * Counted from what the grid shows, so the numbers and the calendar can never
 * disagree about the same days.
 */
export function periodStats(cells: DayCell[]): PeriodStats {
  const entries = cells.filter((cell) => cell.inPeriod).flatMap((cell) => cell.entries);

  let minutes = 0;
  for (const entry of entries) {
    if (!entry.end) continue;
    const span = entry.end.getTime() - entry.start.getTime();
    if (span > 0) minutes += span / 60_000;
  }

  return {
    total: entries.length,
    joinable: entries.filter((entry) => entry.joinable).length,
    unsupported: entries.filter((entry) => entry.platform !== null && !entry.joinable).length,
    hours: Math.round((minutes / 60) * 10) / 10,
  };
}
