/**
 * Date handling in an explicit timezone.
 *
 * Every JS date method that reads calendar parts — `getDate`, `getHours`,
 * `toLocaleTimeString` — silently uses whatever zone the environment happens to
 * be in. Server components run in UTC on Vercel; the browser runs in the user's
 * zone. Left implicit, the same event renders 17:00 on the server and 18:00 in
 * the client, and worse, lands in different day cells.
 *
 * So nothing here reads ambient zone. Every function takes the zone it should
 * work in, and the caller gets it from the calendar itself.
 */

/** Fallback when Google does not tell us the calendar's zone. */
export const DEFAULT_TIME_ZONE = 'UTC';

/**
 * A calendar day, independent of any instant.
 *
 * `2026-08-21` in Lagos and `2026-08-21` in Los Angeles are the same *day* and
 * wildly different spans of time. The grid is built from days, so days are what
 * it stores.
 */
export type DayKey = string; // YYYY-MM-DD

const keyFormatters = new Map<string, Intl.DateTimeFormat>();

function keyFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = keyFormatters.get(timeZone);
  if (!formatter) {
    // en-CA formats as YYYY-MM-DD, which sorts and compares as a string.
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    keyFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/** Which calendar day an instant falls on, in the given zone. */
export function dayKeyOf(instant: Date, timeZone: string): DayKey {
  return keyFormatter(timeZone).format(instant);
}

export function parseDayKey(key: DayKey): { year: number; month: number; day: number } {
  const [year, month, day] = key.split('-').map(Number);
  return { year: year!, month: month! - 1, day: day! };
}

export function makeDayKey(year: number, month: number, day: number): DayKey {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Shift a day key by whole days.
 *
 * Done through UTC on purpose: `Date.UTC` has no daylight-saving transitions,
 * so "add one day" is always exactly one day. Adding 24 hours to a local
 * instant is not — on a DST boundary it lands on the same date, or skips one.
 */
export function addDaysToKey(key: DayKey, days: number): DayKey {
  const { year, month, day } = parseDayKey(key);
  const shifted = new Date(Date.UTC(year, month, day + days));
  return makeDayKey(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
}

/** 0 = Monday … 6 = Sunday, for the calendar day the key names. */
export function weekdayOfKey(key: DayKey): number {
  const { year, month, day } = parseDayKey(key);
  return (new Date(Date.UTC(year, month, day)).getUTCDay() + 6) % 7;
}

/** The instant a calendar day begins, in the given zone. */
export function startOfDayInstant(key: DayKey, timeZone: string): Date {
  const { year, month, day } = parseDayKey(key);
  // Start from the UTC guess, then correct by the zone's offset at that moment.
  // Two passes because the offset itself can differ either side of a DST jump.
  let guess = new Date(Date.UTC(year, month, day));
  for (let pass = 0; pass < 2; pass += 1) {
    const rendered = dayKeyOf(guess, timeZone);
    if (rendered === key) {
      // Walk back to the first instant that still renders as this day.
      let candidate = guess;
      for (let step = 0; step < 26; step += 1) {
        const earlier = new Date(candidate.getTime() - 60 * 60 * 1000);
        if (dayKeyOf(earlier, timeZone) !== key) break;
        candidate = earlier;
      }
      return candidate;
    }
    guess = new Date(guess.getTime() + (rendered < key ? 1 : -1) * 12 * 60 * 60 * 1000);
  }
  return guess;
}

const timeFormatters = new Map<string, Intl.DateTimeFormat>();

/** HH:MM in the given zone, 24-hour, stable across server and client. */
export function formatTime(instant: Date, timeZone: string): string {
  const cacheKey = `t:${timeZone}`;
  let formatter = timeFormatters.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    timeFormatters.set(cacheKey, formatter);
  }
  return formatter.format(instant);
}

/** e.g. "Monday, 27 July" in the given zone. */
export function formatLongDate(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(instant);
}

/** e.g. "August 2026" for the month a key belongs to. */
export function formatMonthYear(key: DayKey): string {
  const { year, month } = parseDayKey(key);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month, 1)));
}

/** e.g. "27 Jul" for the day a key names. */
export function formatDayMonth(key: DayKey): string {
  const { year, month, day } = parseDayKey(key);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
  }).format(new Date(Date.UTC(year, month, day)));
}
