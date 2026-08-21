/**
 * Calendar grid maths. Pure, so the awkward cases — month lengths, leap years,
 * the weeks that straddle two months — can be tested without a browser, a
 * database or a clock.
 */

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
  /** Detail, for the panel. Fetched from Google and previously discarded. */
  description?: string | null;
  location?: string | null;
  organizer?: string | null;
  attendees?: Attendee[];
  /** The event's own page on Google Calendar. */
  htmlLink?: string | null;
};

/**
 * Minutes between start and end.
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

export type CalendarView = 'month' | 'week';

export type DayCell = {
  date: Date;
  /** False for the leading/trailing days borrowed from the neighbouring month. */
  inPeriod: boolean;
  isToday: boolean;
  entries: CalendarEntry[];
};

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function atMidnight(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number): Date {
  // Anchor to the 1st before shifting. Adding a month to the 31st otherwise
  // lands in the month after next, because JS clamps by overflowing.
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1);
  next.setHours(0, 0, 0, 0);
  return next;
}

/** Monday-first, because the working week is what this screen is about. */
export function startOfWeek(now: Date): Date {
  const date = atMidnight(now);
  const weekday = (date.getDay() + 6) % 7; // Mon = 0
  return addDays(date, -weekday);
}

export function startOfMonth(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * The range the grid actually displays — which is what must be synced.
 *
 * A month grid shows days either side of the month, and events on those days
 * are real events the user expects to see. Fetching only the month leaves the
 * first and last rows mysteriously empty.
 */
export function visibleRange(anchor: Date, view: CalendarView): { from: Date; to: Date } {
  if (view === 'week') {
    const from = startOfWeek(anchor);
    return { from, to: addDays(from, 7) };
  }
  const from = startOfWeek(startOfMonth(anchor));
  // Six rows always. A fixed height stops the page reflowing as you page
  // through months, and five-row months are the minority.
  return { from, to: addDays(from, 42) };
}

/**
 * Bucket entries into the cells of the visible grid.
 *
 * Entries outside the range are dropped rather than clamped to the nearest day —
 * a meeting shown on the wrong date is worse than one not shown.
 */
export function buildGrid(
  anchor: Date,
  now: Date,
  view: CalendarView,
  entries: CalendarEntry[],
): DayCell[] {
  const { from } = visibleRange(anchor, view);
  const length = view === 'week' ? 7 : 42;
  const month = anchor.getMonth();

  return Array.from({ length }, (_, offset) => {
    const date = addDays(from, offset);
    return {
      date,
      inPeriod: view === 'week' ? true : date.getMonth() === month,
      isToday: sameDay(date, now),
      entries: entries
        .filter((entry) => sameDay(entry.start, date))
        .sort((a, b) => a.start.getTime() - b.start.getTime()),
    };
  });
}

/** Anything happening right now, by wall clock. */
export function isLive(entry: CalendarEntry, now: Date): boolean {
  if (entry.end && entry.end.getTime() <= now.getTime()) return false;
  const sinceStart = now.getTime() - entry.start.getTime();
  if (sinceStart < 0) return false;
  // With no end time, an hour is the window — otherwise a meeting stays pinned
  // as "live" for the rest of the day.
  return entry.end ? true : sinceStart < 60 * 60 * 1000;
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

/** e.g. "August 2026", or "17 – 23 Aug" for a week. */
export function periodLabel(anchor: Date, view: CalendarView): string {
  if (view === 'month') {
    return anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }
  const from = startOfWeek(anchor);
  const to = addDays(from, 6);
  const fromPart = from.toLocaleDateString(undefined, { day: 'numeric' });
  const toPart = to.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: from.getFullYear() === to.getFullYear() ? undefined : 'numeric',
  });
  return `${fromPart} – ${toPart}`;
}
