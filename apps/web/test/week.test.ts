import { describe, expect, it } from 'bun:test';
import { addDays, buildWeek, isLive, startOfWeek, type CalendarEntry } from '../src/module/dashboard/week';

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
    // Wed 2026-08-19 -> Mon 2026-08-17
    expect(startOfWeek(new Date('2026-08-19T12:00:00')).getDate()).toBe(17);
  });

  it('treats Sunday as the end of the week, not the start', () => {
    // Sun 2026-08-23 belongs to the week beginning Mon 2026-08-17.
    expect(startOfWeek(new Date('2026-08-23T23:30:00')).getDate()).toBe(17);
  });

  it('starts at midnight so an early meeting is not pushed into the previous day', () => {
    const start = startOfWeek(new Date('2026-08-19T00:30:00'));
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
  });

  it('crosses a month boundary', () => {
    // Tue 2026-09-01 -> Mon 2026-08-31
    const start = startOfWeek(new Date('2026-09-01T09:00:00'));
    expect(start.getMonth()).toBe(7);
    expect(start.getDate()).toBe(31);
  });
});

describe('buildWeek', () => {
  const now = new Date('2026-08-19T12:00:00'); // Wednesday

  it('returns seven days and marks today exactly once', () => {
    const week = buildWeek(now, []);
    expect(week).toHaveLength(7);
    expect(week.filter((d) => d.isToday)).toHaveLength(1);
    expect(week.find((d) => d.isToday)?.date.getDate()).toBe(19);
  });

  it('buckets entries onto their own day', () => {
    const week = buildWeek(now, [
      entry({ id: 'mon', start: new Date('2026-08-17T09:00:00') }),
      entry({ id: 'wed', start: new Date('2026-08-19T15:00:00') }),
    ]);
    expect(week[0]!.entries.map((e) => e.id)).toEqual(['mon']);
    expect(week[2]!.entries.map((e) => e.id)).toEqual(['wed']);
  });

  it('orders a day by start time', () => {
    const week = buildWeek(now, [
      entry({ id: 'late', start: new Date('2026-08-19T16:00:00') }),
      entry({ id: 'early', start: new Date('2026-08-19T09:00:00') }),
    ]);
    expect(week[2]!.entries.map((e) => e.id)).toEqual(['early', 'late']);
  });

  it('drops entries outside the week rather than clamping them', () => {
    // Showing a meeting on the wrong date is worse than not showing it.
    const week = buildWeek(now, [
      entry({ id: 'lastweek', start: new Date('2026-08-10T09:00:00') }),
      entry({ id: 'nextweek', start: new Date('2026-08-25T09:00:00') }),
    ]);
    expect(week.flatMap((d) => d.entries)).toHaveLength(0);
  });
});

describe('isLive', () => {
  const now = new Date('2026-08-19T12:00:00');

  it('is true between start and end', () => {
    expect(
      isLive(
        entry({ start: new Date('2026-08-19T11:30:00'), end: new Date('2026-08-19T12:30:00') }),
        now,
      ),
    ).toBe(true);
  });

  it('is false before it starts and after it ends', () => {
    expect(isLive(entry({ start: new Date('2026-08-19T13:00:00') }), now)).toBe(false);
    expect(
      isLive(
        entry({ start: new Date('2026-08-19T10:00:00'), end: new Date('2026-08-19T11:00:00') }),
        now,
      ),
    ).toBe(false);
  });

  it('is not live at the exact moment it ends', () => {
    // Boundary, pinned: a meeting whose end equals now has finished. Left
    // unasserted, flipping <= to < would silently keep it on screen.
    expect(
      isLive(
        entry({ start: new Date('2026-08-19T11:00:00'), end: new Date('2026-08-19T12:00:00') }),
        now,
      ),
    ).toBe(false);
  });

  it('is live at the exact moment it starts', () => {
    expect(
      isLive(
        entry({ start: new Date('2026-08-19T12:00:00'), end: new Date('2026-08-19T13:00:00') }),
        now,
      ),
    ).toBe(true);
  });

  it('gives an endless meeting an hour, not the rest of the day', () => {
    expect(isLive(entry({ start: new Date('2026-08-19T11:30:00'), end: null }), now)).toBe(true);
    expect(isLive(entry({ start: new Date('2026-08-19T09:00:00'), end: null }), now)).toBe(false);
  });
});

describe('addDays', () => {
  it('rolls over a month end', () => {
    expect(addDays(new Date('2026-08-31T00:00:00'), 1).getMonth()).toBe(8);
  });
});
