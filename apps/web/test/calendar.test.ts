import { describe, expect, it } from 'bun:test';
import {
  addMonthsToKey,
  buildGrid,
  cellCount,
  durationMinutes,
  firstCellKey,
  formatDuration,
  hasEnded,
  isLive,
  periodStats,
  startOfMonthKey,
  startOfWeekKey,
  type CalendarEntry,
} from '../src/module/dashboard/calendar';

const LAGOS = 'Africa/Lagos'; // UTC+1
const UTC = 'UTC';

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

describe('startOfWeekKey', () => {
  it('is Monday-first', () => {
    expect(startOfWeekKey('2026-08-19')).toBe('2026-08-17');
  });

  it('treats Sunday as the end of the week, not the start', () => {
    expect(startOfWeekKey('2026-08-23')).toBe('2026-08-17');
  });

  it('crosses a month boundary', () => {
    expect(startOfWeekKey('2026-09-01')).toBe('2026-08-31');
  });
});

describe('addMonthsToKey', () => {
  it('does not overflow from a long month into the month after next', () => {
    // 31 Aug + 1 month naively becomes 31 Sep, which JS rolls into October.
    expect(addMonthsToKey('2026-08-31', 1)).toBe('2026-09-01');
    expect(addMonthsToKey('2026-01-31', 1)).toBe('2026-02-01');
  });

  it('walks backwards across a year boundary', () => {
    expect(addMonthsToKey('2026-01-15', -1)).toBe('2025-12-01');
  });
});

describe('firstCellKey', () => {
  it('starts before the 1st when the month does not begin on a Monday', () => {
    // 1 Aug 2026 is a Saturday, so the grid must reach back into July or the
    // first row renders empty and the events on those days vanish.
    expect(firstCellKey('2026-08-15', 'month')).toBe('2026-07-27');
  });

  it('is the Monday of the week for a week view', () => {
    expect(firstCellKey('2026-08-19', 'week')).toBe('2026-08-17');
  });
});

describe('cellCount', () => {
  it('is six rows for a month and one for a week', () => {
    expect(cellCount('month')).toBe(42);
    expect(cellCount('week')).toBe(7);
  });
});

describe('buildGrid', () => {
  const today = '2026-08-19';

  it('returns 42 cells for a month and 7 for a week', () => {
    expect(buildGrid(today, today, 'month', [], UTC)).toHaveLength(42);
    expect(buildGrid(today, today, 'week', [], UTC)).toHaveLength(7);
  });

  it('marks leading and trailing days as outside the period', () => {
    const cells = buildGrid(today, today, 'month', [], UTC);
    expect(cells[0]!.inPeriod).toBe(false); // 27 Jul
    expect(cells.filter((c) => c.inPeriod)).toHaveLength(31);
  });

  it('marks today exactly once', () => {
    const cells = buildGrid(today, today, 'month', [], UTC);
    expect(cells.filter((c) => c.isToday)).toHaveLength(1);
    expect(cells.find((c) => c.isToday)?.dayOfMonth).toBe(19);
  });

  it('buckets an event by its day in the display zone, not the runtime zone', () => {
    // The production bug. 2026-08-19T23:30Z is the 19th in UTC and already the
    // 20th in Lagos. A grid that asked `getDate()` would file it under whichever
    // zone the process happened to be in.
    const lateEvening = entry({ id: 'late', start: new Date('2026-08-19T23:30:00Z') });

    const utcCells = buildGrid(today, today, 'month', [lateEvening], UTC);
    expect(utcCells.find((c) => c.entries.some((e) => e.id === 'late'))?.dayOfMonth).toBe(19);

    const lagosCells = buildGrid(today, today, 'month', [lateEvening], LAGOS);
    expect(lagosCells.find((c) => c.entries.some((e) => e.id === 'late'))?.dayOfMonth).toBe(20);
  });

  it('keeps a just-after-midnight event on its own local day', () => {
    // 00:30 in Lagos is 23:30 UTC the day before.
    const justAfterMidnight = entry({ id: 'early', start: new Date('2026-08-20T00:30:00+01:00') });
    const cells = buildGrid(today, today, 'month', [justAfterMidnight], LAGOS);
    expect(cells.find((c) => c.entries.some((e) => e.id === 'early'))?.dayOfMonth).toBe(20);
  });

  it('still shows events on the leading days', () => {
    const cells = buildGrid(today, today, 'month', [
      entry({ id: 'jul', start: new Date('2026-07-28T09:00:00Z') }),
    ], UTC);
    expect(cells[1]!.entries.map((e) => e.id)).toEqual(['jul']);
  });

  it('orders a day by start time', () => {
    const cells = buildGrid(today, today, 'week', [
      entry({ id: 'late', start: new Date('2026-08-19T16:00:00Z') }),
      entry({ id: 'early', start: new Date('2026-08-19T09:00:00Z') }),
    ], UTC);
    expect(cells[2]!.entries.map((e) => e.id)).toEqual(['early', 'late']);
  });

  it('drops entries outside the grid rather than clamping them', () => {
    const cells = buildGrid(today, today, 'month', [
      entry({ id: 'far', start: new Date('2026-03-03T09:00:00Z') }),
    ], UTC);
    expect(cells.flatMap((c) => c.entries)).toHaveLength(0);
  });

  it('handles February in leap and non-leap years', () => {
    expect(
      buildGrid('2028-02-10', '2028-02-10', 'month', [], UTC).filter((c) => c.inPeriod),
    ).toHaveLength(29);
    expect(
      buildGrid('2026-02-10', '2026-02-10', 'month', [], UTC).filter((c) => c.inPeriod),
    ).toHaveLength(28);
  });

  it('keeps 42 cells even for a month that needs only five rows', () => {
    expect(buildGrid('2026-02-10', '2026-02-10', 'month', [], UTC)).toHaveLength(42);
  });
});

describe('periodStats', () => {
  const today = '2026-08-19';

  it('counts only what is inside the period', () => {
    const cells = buildGrid(today, today, 'month', [
      entry({ id: 'jul', start: new Date('2026-07-28T09:00:00Z') }),
      entry({ id: 'aug', start: new Date('2026-08-19T09:00:00Z') }),
    ], UTC);
    expect(periodStats(cells).total).toBe(1);
  });

  it('separates joinable from unsupported, and ignores events with no platform', () => {
    const cells = buildGrid(today, today, 'month', [
      entry({ id: 'meet', start: new Date('2026-08-18T09:00:00Z') }),
      entry({
        id: 'zoom',
        start: new Date('2026-08-19T09:00:00Z'),
        platform: 'zoom',
        joinable: false,
      }),
      entry({
        id: 'none',
        start: new Date('2026-08-20T09:00:00Z'),
        platform: null,
        joinable: false,
      }),
    ], UTC);
    const stats = periodStats(cells);
    expect(stats.total).toBe(3);
    expect(stats.joinable).toBe(1);
    expect(stats.unsupported).toBe(1);
  });

  it('sums hours and skips events with no end time', () => {
    const cells = buildGrid(today, today, 'month', [
      entry({
        id: 'a',
        start: new Date('2026-08-18T09:00:00Z'),
        end: new Date('2026-08-18T10:30:00Z'),
      }),
      entry({ id: 'b', start: new Date('2026-08-19T09:00:00Z'), end: null }),
    ], UTC);
    expect(periodStats(cells).hours).toBe(1.5);
  });

  it('agrees with the grid about which days count, in any zone', () => {
    // 2026-08-31T23:30Z is August in UTC and September in Lagos. The stats and
    // the grid must not disagree about that.
    const boundary = entry({ id: 'edge', start: new Date('2026-08-31T23:30:00Z') });
    expect(periodStats(buildGrid('2026-08-15', '2026-08-15', 'month', [boundary], UTC)).total).toBe(1);
    expect(periodStats(buildGrid('2026-08-15', '2026-08-15', 'month', [boundary], LAGOS)).total).toBe(0);
  });

  it('is all zeroes for an empty period', () => {
    expect(periodStats(buildGrid('2026-08-19', '2026-08-19', 'month', [], UTC))).toEqual({
      total: 0,
      joinable: 0,
      unsupported: 0,
      hours: 0,
    });
  });
});

describe('isLive', () => {
  const now = new Date('2026-08-19T12:00:00Z');

  it('is true between start and end', () => {
    expect(
      isLive(
        entry({
          start: new Date('2026-08-19T11:30:00Z'),
          end: new Date('2026-08-19T12:30:00Z'),
        }),
        now,
      ),
    ).toBe(true);
  });

  it('is not live at the exact moment it ends', () => {
    expect(
      isLive(
        entry({ start: new Date('2026-08-19T11:00:00Z'), end: new Date('2026-08-19T12:00:00Z') }),
        now,
      ),
    ).toBe(false);
  });

  it('is live at the exact moment it starts', () => {
    expect(
      isLive(
        entry({ start: new Date('2026-08-19T12:00:00Z'), end: new Date('2026-08-19T13:00:00Z') }),
        now,
      ),
    ).toBe(true);
  });

  it('gives an endless meeting an hour, not the rest of the day', () => {
    expect(isLive(entry({ start: new Date('2026-08-19T11:30:00Z') }), now)).toBe(true);
    expect(isLive(entry({ start: new Date('2026-08-19T09:00:00Z') }), now)).toBe(false);
  });
});

describe('hasEnded', () => {
  const now = new Date('2026-08-19T12:00:00Z');

  it('is true once the end time has passed', () => {
    expect(
      hasEnded(
        entry({ start: new Date('2026-08-19T11:00:00Z'), end: new Date('2026-08-19T11:30:00Z') }),
        now,
      ),
    ).toBe(true);
  });

  it('is true at the exact moment it ends, where isLive is false', () => {
    // The two must partition the timeline with no gap and no overlap.
    const ending = entry({
      start: new Date('2026-08-19T11:00:00Z'),
      end: new Date('2026-08-19T12:00:00Z'),
    });
    expect(hasEnded(ending, now)).toBe(true);
    expect(isLive(ending, now)).toBe(false);
  });

  it('is false for a meeting that has not started', () => {
    expect(hasEnded(entry({ start: new Date('2026-08-19T14:00:00Z') }), now)).toBe(false);
  });

  it('gives an endless meeting the same hour isLive gives it', () => {
    const stale = entry({ start: new Date('2026-08-19T09:00:00Z'), end: null });
    expect(hasEnded(stale, now)).toBe(true);
    expect(isLive(stale, now)).toBe(false);

    const recent = entry({ start: new Date('2026-08-19T11:30:00Z'), end: null });
    expect(hasEnded(recent, now)).toBe(false);
    expect(isLive(recent, now)).toBe(true);
  });
});

describe('startOfMonthKey', () => {
  it('is the first of that month', () => {
    expect(startOfMonthKey('2026-08-19')).toBe('2026-08-01');
  });
});

describe('durationMinutes', () => {
  const start = new Date('2026-08-19T09:00:00Z');

  it('is the gap in whole minutes', () => {
    expect(durationMinutes(entry({ start, end: new Date('2026-08-19T10:30:00Z') }))).toBe(90);
  });

  it('is null when there is no end time', () => {
    expect(durationMinutes(entry({ start, end: null }))).toBeNull();
  });

  it('is 0 for a zero-length event, not null', () => {
    // Google allows these and they are a real point in time. Returning null
    // would imply the end time is missing when it is present and equal.
    expect(durationMinutes(entry({ start, end: new Date('2026-08-19T09:00:00Z') }))).toBe(0);
  });

  it('is null when the end precedes the start', () => {
    expect(durationMinutes(entry({ start, end: new Date('2026-08-19T08:00:00Z') }))).toBeNull();
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
