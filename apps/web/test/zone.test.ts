import { describe, expect, it } from 'bun:test';
import {
  addDaysToKey,
  dayKeyOf,
  formatDayMonth,
  formatLongDate,
  formatMonthYear,
  formatTime,
  makeDayKey,
  parseDayKey,
  startOfDayInstant,
  weekdayOfKey,
} from '../src/module/dashboard/zone';

const LAGOS = 'Africa/Lagos'; // UTC+1, no DST — the operator's zone
const LA = 'America/Los_Angeles'; // UTC-7/-8, has DST
const UTC = 'UTC';

describe('dayKeyOf', () => {
  it('puts an instant on the right calendar day for the zone', () => {
    // 2026-08-21T23:30Z is still the 21st in UTC but already the 22nd in Lagos.
    const instant = new Date('2026-08-21T23:30:00Z');
    expect(dayKeyOf(instant, UTC)).toBe('2026-08-21');
    expect(dayKeyOf(instant, LAGOS)).toBe('2026-08-22');
  });

  it('puts an instant on the previous day west of Greenwich', () => {
    // The exact production bug, mirrored: 00:30 in Lagos is 23:30 UTC the day
    // before, and a grid built in UTC would file it under the wrong date.
    const instant = new Date('2026-08-22T00:30:00+01:00');
    expect(dayKeyOf(instant, LAGOS)).toBe('2026-08-22');
    expect(dayKeyOf(instant, UTC)).toBe('2026-08-21');
  });

  it('handles a zone behind UTC', () => {
    const instant = new Date('2026-08-21T02:00:00Z');
    expect(dayKeyOf(instant, LA)).toBe('2026-08-20');
  });
});

describe('addDaysToKey', () => {
  it('crosses month and year boundaries', () => {
    expect(addDaysToKey('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDaysToKey('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('handles February in leap and non-leap years', () => {
    expect(addDaysToKey('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDaysToKey('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('adds exactly one day across a DST transition', () => {
    // The reason this goes through Date.UTC: adding 24 hours to a local instant
    // on a spring-forward boundary lands on the same date or skips one.
    expect(addDaysToKey('2026-03-07', 1)).toBe('2026-03-08'); // US spring forward
    expect(addDaysToKey('2026-10-31', 1)).toBe('2026-11-01'); // US fall back
  });

  it('is a no-op for zero', () => {
    expect(addDaysToKey('2026-08-21', 0)).toBe('2026-08-21');
  });
});

describe('weekdayOfKey', () => {
  it('is Monday-indexed', () => {
    expect(weekdayOfKey('2026-08-17')).toBe(0); // Monday
    expect(weekdayOfKey('2026-08-23')).toBe(6); // Sunday
  });
});

describe('startOfDayInstant', () => {
  it('is midnight in the zone, not in UTC', () => {
    const start = startOfDayInstant('2026-08-21', LAGOS);
    expect(formatTime(start, LAGOS)).toBe('00:00');
    // Which is 23:00 the previous day in UTC.
    expect(dayKeyOf(start, UTC)).toBe('2026-08-20');
  });

  it('round-trips: the instant renders as the day it came from', () => {
    for (const zone of [UTC, LAGOS, LA]) {
      for (const key of ['2026-01-01', '2026-08-21', '2026-03-08', '2026-11-01']) {
        expect(dayKeyOf(startOfDayInstant(key, zone), zone)).toBe(key);
      }
    }
  });

  it('lands on the right day across a DST spring-forward', () => {
    // 8 Mar 2026, US clocks jump 02:00 -> 03:00. Midnight still exists.
    const start = startOfDayInstant('2026-03-08', LA);
    expect(dayKeyOf(start, LA)).toBe('2026-03-08');
    expect(formatTime(start, LA)).toBe('00:00');
  });
});

describe('formatTime', () => {
  it('renders the same instant differently per zone, and 24-hour', () => {
    const instant = new Date('2026-07-27T17:00:00Z');
    expect(formatTime(instant, UTC)).toBe('17:00');
    expect(formatTime(instant, LAGOS)).toBe('18:00');
  });

  it('is stable regardless of the ambient environment zone', () => {
    // The whole point: two callers in different environments, told the same
    // zone, must produce the same string.
    const instant = new Date('2026-07-27T17:00:00Z');
    expect(formatTime(instant, LAGOS)).toBe(formatTime(new Date(instant), LAGOS));
  });
});

describe('key helpers', () => {
  it('round-trip through parse and make', () => {
    const { year, month, day } = parseDayKey('2026-08-21');
    expect(makeDayKey(year, month, day)).toBe('2026-08-21');
  });

  it('pad single digits', () => {
    expect(makeDayKey(2026, 0, 5)).toBe('2026-01-05');
  });

  it('format month and day labels from the key, not from an instant', () => {
    expect(formatMonthYear('2026-08-21')).toBe('August 2026');
    expect(formatDayMonth('2026-07-27')).toBe('27 Jul');
  });
});

describe('formatLongDate', () => {
  it('uses the given zone', () => {
    const instant = new Date('2026-08-21T23:30:00Z');
    expect(formatLongDate(instant, LAGOS)).toContain('22');
    expect(formatLongDate(instant, UTC)).toContain('21');
  });
});
