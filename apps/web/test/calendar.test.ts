import { describe, expect, it } from 'bun:test';
import {
  addMonths,
  durationMinutes,
  formatDuration,
  buildGrid,
  isLive,
  periodStats,
  startOfMonth,
  startOfWeek,
  visibleRange,
  type CalendarEntry,
} from '../src/module/dashboard/calendar';

function entry(partial: Partial<CalendarEntry> & { start: Date }): CalendarEntry {
  return {
    id: 'e1',
    title: 'Standup',
    end: null,
    platform: 'meet',
    url: 'https://meet.google.com/abc-defg-hij',
    joinable: true,
    ...partial,
  };
}

describe('startOfWeek', () => {
  it('is Monday-first', () => {
    expect(startOfWeek(new Date(2026, 7, 19, 12)).getDate()).toBe(17);
  });

  it('treats Sunday as the end of the week, not the start', () => {
    expect(startOfWeek(new Date(2026, 7, 23, 23, 30)).getDate()).toBe(17);
  });

  it('crosses a month boundary', () => {
    const start = startOfWeek(new Date(2026, 8, 1, 9));
    expect(start.getMonth()).toBe(7);
    expect(start.getDate()).toBe(31);
  });
});

describe('addMonths', () => {
  it('does not overflow from a long month into the month after next', () => {
    // The classic bug: 31 Aug + 1 month naively becomes 31 Sep, which JS
    // silently rolls into October.
    expect(addMonths(new Date(2026, 7, 31), 1).getMonth()).toBe(8);
    expect(addMonths(new Date(2026, 0, 31), 1).getMonth()).toBe(1);
  });

  it('walks backwards across a year boundary', () => {
    const back = addMonths(new Date(2026, 0, 15), -1);
    expect(back.getFullYear()).toBe(2025);
    expect(back.getMonth()).toBe(11);
  });

  it('always lands on the first of the month at midnight', () => {
    const next = addMonths(new Date(2026, 7, 19, 15, 45), 1);
    expect(next.getDate()).toBe(1);
    expect(next.getHours()).toBe(0);
  });
});

describe('visibleRange', () => {
  it('covers six whole weeks for a month, starting on a Monday', () => {
    const { from, to } = visibleRange(new Date(2026, 7, 19), 'month');
    expect(from.getDay()).toBe(1);
    expect(Math.round((to.getTime() - from.getTime()) / 86_400_000)).toBe(42);
  });

  it('starts before the 1st when the month does not begin on a Monday', () => {
    // 1 Aug 2026 is a Saturday, so the grid must reach back into July or the
    // first row renders empty and the events on those days vanish.
    const { from } = visibleRange(new Date(2026, 7, 15), 'month');
    expect(from.getMonth()).toBe(6);
    expect(from.getDate()).toBe(27);
  });

  it('covers exactly seven days for a week', () => {
    const { from, to } = visibleRange(new Date(2026, 7, 19), 'week');
    expect(Math.round((to.getTime() - from.getTime()) / 86_400_000)).toBe(7);
  });
});

describe('buildGrid', () => {
  const now = new Date(2026, 7, 19, 12); // Wed 19 Aug 2026

  it('returns 42 cells for a month and 7 for a week', () => {
    expect(buildGrid(now, now, 'month', [])).toHaveLength(42);
    expect(buildGrid(now, now, 'week', [])).toHaveLength(7);
  });

  it('marks leading and trailing days as outside the period', () => {
    const cells = buildGrid(now, now, 'month', []);
    expect(cells[0]!.inPeriod).toBe(false); // 27 Jul
    expect(cells.filter((c) => c.inPeriod)).toHaveLength(31); // August
  });

  it('marks today exactly once', () => {
    const cells = buildGrid(now, now, 'month', []);
    expect(cells.filter((c) => c.isToday)).toHaveLength(1);
    expect(cells.find((c) => c.isToday)?.date.getDate()).toBe(19);
  });

  it('still shows events on the leading days', () => {
    // These belong to July but are on screen, so dropping them would leave a
    // visibly empty first row that the user knows is wrong.
    const cells = buildGrid(now, now, 'month', [
      entry({ id: 'jul', start: new Date(2026, 6, 28, 9) }),
    ]);
    expect(cells[1]!.entries.map((e) => e.id)).toEqual(['jul']);
  });

  it('orders a day by start time', () => {
    const cells = buildGrid(now, now, 'week', [
      entry({ id: 'late', start: new Date(2026, 7, 19, 16) }),
      entry({ id: 'early', start: new Date(2026, 7, 19, 9) }),
    ]);
    expect(cells[2]!.entries.map((e) => e.id)).toEqual(['early', 'late']);
  });

  it('drops entries outside the grid rather than clamping them', () => {
    const cells = buildGrid(now, now, 'month', [
      entry({ id: 'far', start: new Date(2026, 2, 3, 9) }),
    ]);
    expect(cells.flatMap((c) => c.entries)).toHaveLength(0);
  });

  it('handles February in a leap year', () => {
    const feb = new Date(2028, 1, 10, 12);
    const cells = buildGrid(feb, feb, 'month', []);
    expect(cells.filter((c) => c.inPeriod)).toHaveLength(29);
  });

  it('handles February in a non-leap year', () => {
    const feb = new Date(2026, 1, 10, 12);
    const cells = buildGrid(feb, feb, 'month', []);
    expect(cells.filter((c) => c.inPeriod)).toHaveLength(28);
  });

  it('keeps 42 cells even for a month that needs only five rows', () => {
    // A fixed height stops the page jumping as you page between months.
    const feb = new Date(2026, 1, 10, 12);
    expect(buildGrid(feb, feb, 'month', [])).toHaveLength(42);
  });
});

describe('periodStats', () => {
  const now = new Date(2026, 7, 19, 12);

  it('counts only what is inside the period', () => {
    // A July event visible in the leading row must not inflate August's totals.
    const cells = buildGrid(now, now, 'month', [
      entry({ id: 'jul', start: new Date(2026, 6, 28, 9) }),
      entry({ id: 'aug', start: new Date(2026, 7, 19, 9) }),
    ]);
    expect(periodStats(cells).total).toBe(1);
  });

  it('separates joinable from unsupported, and ignores events with no platform', () => {
    const cells = buildGrid(now, now, 'month', [
      entry({ id: 'meet', start: new Date(2026, 7, 18, 9) }),
      entry({ id: 'zoom', start: new Date(2026, 7, 19, 9), platform: 'zoom', joinable: false }),
      entry({ id: 'none', start: new Date(2026, 7, 20, 9), platform: null, joinable: false }),
    ]);
    const stats = periodStats(cells);
    expect(stats.total).toBe(3);
    expect(stats.joinable).toBe(1);
    expect(stats.unsupported).toBe(1);
  });

  it('sums hours and skips events with no end time', () => {
    const cells = buildGrid(now, now, 'month', [
      entry({
        id: 'a',
        start: new Date(2026, 7, 18, 9),
        end: new Date(2026, 7, 18, 10, 30),
      }),
      entry({ id: 'b', start: new Date(2026, 7, 19, 9), end: null }),
    ]);
    expect(periodStats(cells).hours).toBe(1.5);
  });

  it('is all zeroes for an empty period', () => {
    expect(periodStats(buildGrid(now, now, 'month', []))).toEqual({
      total: 0,
      joinable: 0,
      unsupported: 0,
      hours: 0,
    });
  });
});

describe('isLive', () => {
  const now = new Date(2026, 7, 19, 12);

  it('is true between start and end', () => {
    expect(
      isLive(entry({ start: new Date(2026, 7, 19, 11, 30), end: new Date(2026, 7, 19, 12, 30) }), now),
    ).toBe(true);
  });

  it('is not live at the exact moment it ends', () => {
    expect(
      isLive(entry({ start: new Date(2026, 7, 19, 11), end: new Date(2026, 7, 19, 12) }), now),
    ).toBe(false);
  });

  it('is live at the exact moment it starts', () => {
    expect(
      isLive(entry({ start: new Date(2026, 7, 19, 12), end: new Date(2026, 7, 19, 13) }), now),
    ).toBe(true);
  });

  it('gives an endless meeting an hour, not the rest of the day', () => {
    expect(isLive(entry({ start: new Date(2026, 7, 19, 11, 30) }), now)).toBe(true);
    expect(isLive(entry({ start: new Date(2026, 7, 19, 9) }), now)).toBe(false);
  });
});

describe('startOfMonth', () => {
  it('is the first, whatever the time of day', () => {
    const first = startOfMonth(new Date(2026, 7, 19, 23, 59));
    expect(first.getDate()).toBe(1);
    expect(first.getMonth()).toBe(7);
  });
});

describe('anchor parsing (mirrors the page helper)', () => {
  // The page's parseAnchor is not exported, so the rule it encodes is pinned
  // here: a date string must round-trip, because JS normalises rather than
  // rejecting an impossible day.
  function parseAnchor(raw: string | undefined, fallback: Date): Date {
    if (!raw) return fallback;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (!match) return fallback;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const parsed = new Date(year, month, day);
    const roundTrips =
      parsed.getFullYear() === year && parsed.getMonth() === month && parsed.getDate() === day;
    return roundTrips ? parsed : fallback;
  }

  const fallback = new Date(2026, 7, 19);

  it('accepts a real date, at local midnight', () => {
    const parsed = parseAnchor('2026-03-09', fallback);
    expect(parsed.getMonth()).toBe(2);
    expect(parsed.getDate()).toBe(9);
    expect(parsed.getHours()).toBe(0);
  });

  it('rejects an impossible day instead of rolling it forward', () => {
    // new Date(2026, 1, 31) is 3 March, not invalid — getTime() alone would
    // accept it and silently show the wrong month.
    expect(parseAnchor('2026-02-31', fallback)).toEqual(fallback);
    expect(parseAnchor('2026-04-31', fallback)).toEqual(fallback);
    expect(parseAnchor('2026-13-01', fallback)).toEqual(fallback);
  });

  it('accepts 29 February in a leap year and rejects it otherwise', () => {
    expect(parseAnchor('2028-02-29', fallback).getDate()).toBe(29);
    expect(parseAnchor('2026-02-29', fallback)).toEqual(fallback);
  });

  it('falls back on junk and on nothing', () => {
    expect(parseAnchor(undefined, fallback)).toEqual(fallback);
    expect(parseAnchor('not-a-date', fallback)).toEqual(fallback);
    expect(parseAnchor('2026-8-1', fallback)).toEqual(fallback);
  });
});

describe('durationMinutes', () => {
  const start = new Date(2026, 7, 19, 9);

  it('is the gap in whole minutes', () => {
    expect(durationMinutes(entry({ start, end: new Date(2026, 7, 19, 10, 30) }))).toBe(90);
  });

  it('is null when there is no end time', () => {
    expect(durationMinutes(entry({ start, end: null }))).toBeNull();
  });

  it('is 0 for a zero-length event, not null', () => {
    // Google allows these and they are a real point in time. Returning null
    // would imply the end time is missing when it is present and equal.
    expect(durationMinutes(entry({ start, end: new Date(2026, 7, 19, 9) }))).toBe(0);
  });

  it('is null when the end precedes the start', () => {
    // Corrupt data; no honest number can be derived from it.
    expect(durationMinutes(entry({ start, end: new Date(2026, 7, 19, 8) }))).toBeNull();
  });
});

describe('formatDuration', () => {
  it('renders minutes, hours, and both', () => {
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(90)).toBe('1h 30m');
    expect(formatDuration(125)).toBe('2h 5m');
  });

  it('passes null through rather than inventing a zero', () => {
    expect(formatDuration(null)).toBeNull();
  });

  it('renders a zero-length event as 0m', () => {
    expect(formatDuration(0)).toBe('0m');
  });
});
