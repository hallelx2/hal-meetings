/**
 * Week maths for the dashboard calendar. Pure, so it can be tested without a
 * browser, a database or a clock.
 */

export type CalendarEntry = {
  id: string;
  title: string;
  start: Date;
  end: Date | null;
  platform: 'meet' | 'zoom' | 'teams' | null;
  url: string | null;
  joinable: boolean;
  /** Present only once Hal has a row for it. */
  status?: string | null;
  policy?: string | null;
};

export type DayColumn = {
  date: Date;
  isToday: boolean;
  entries: CalendarEntry[];
};

/** Monday-first, because the working week is what this screen is about. */
export function startOfWeek(now: Date): Date {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  const weekday = (date.getDay() + 6) % 7; // Mon = 0
  date.setDate(date.getDate() - weekday);
  return date;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Bucket entries into the seven days of the week containing `now`.
 *
 * Entries outside the week are dropped rather than clamped into the nearest
 * day — a meeting shown on the wrong date is worse than one not shown.
 */
export function buildWeek(now: Date, entries: CalendarEntry[]): DayColumn[] {
  const start = startOfWeek(now);

  return Array.from({ length: 7 }, (_, offset) => {
    const date = addDays(start, offset);
    return {
      date,
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
  const startedWithinTheHour = now.getTime() - entry.start.getTime();
  if (startedWithinTheHour < 0) return false;
  // With no end time, treat an hour as the window rather than leaving a meeting
  // pinned as "live" for the rest of the day.
  return entry.end ? true : startedWithinTheHour < 60 * 60 * 1000;
}
