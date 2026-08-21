import { describe, expect, it } from 'bun:test';
import { halPlan } from '../src/module/dashboard/hal-plan';
import type { CalendarEntry } from '../src/module/dashboard/calendar';

const NOW = new Date('2026-08-19T12:00:00Z');

function entry(partial: Partial<CalendarEntry> = {}): CalendarEntry {
  return {
    id: 'e1',
    title: 'Standup',
    start: new Date('2026-08-19T14:00:00Z'),
    end: new Date('2026-08-19T14:30:00Z'),
    platform: 'meet',
    url: 'https://meet.google.com/abc-defg-hij',
    joinable: true,
    ...partial,
  };
}

describe('halPlan — when Hal cannot attend', () => {
  it('blocks an event with no meeting link', () => {
    const plan = halPlan(entry({ platform: null, url: null, joinable: false }), NOW);
    expect(plan.posture).toBe('blocked');
    expect(plan.reason).toMatch(/no meeting link/);
    expect(plan.stages.every((s) => s.state === 'blocked')).toBe(true);
    expect(plan.sendable).toBe(false);
  });

  it('names the platform it does not support yet', () => {
    const zoom = halPlan(entry({ platform: 'zoom', joinable: false }), NOW);
    expect(zoom.reason).toMatch(/Zoom/);

    const teams = halPlan(entry({ platform: 'teams', joinable: false }), NOW);
    expect(teams.reason).toMatch(/Microsoft Teams/);
  });

  it('respects an explicit ignore policy over the link being perfectly joinable', () => {
    const plan = halPlan(entry({ policy: 'ignore' }), NOW);
    expect(plan.posture).toBe('blocked');
    expect(plan.reason).toMatch(/skip/);
  });

  it('reports a cancelled meeting as cancelled, not as a missing link', () => {
    // Both facts are true at once. The cancellation is the one that explains
    // the other, so it has to win.
    const plan = halPlan(entry({ status: 'cancelled', url: null, joinable: false }), NOW);
    expect(plan.reason).toMatch(/cancelled/);
  });

  it('blocks a link it cannot parse even when a platform was guessed', () => {
    expect(halPlan(entry({ joinable: false }), NOW).reason).toMatch(/does not recognise/);
  });
});

describe('halPlan — when Hal has not been asked', () => {
  it('does not claim a synced calendar meeting as booked', () => {
    // Calendar sync files every joinable event as policy 'ask'. Reading the
    // green "Hal can join" chip as a commitment is the misreading this exists
    // to prevent.
    const plan = halPlan(entry({ status: 'scheduled', policy: 'ask' }), NOW);
    expect(plan.posture).toBe('unbooked');
    expect(plan.headline).toMatch(/not booked/);
    expect(plan.sendable).toBe(true);
    expect(plan.stages.every((s) => s.state === 'pending')).toBe(true);
  });

  it('treats an event with no Hal row at all the same way', () => {
    expect(halPlan(entry(), NOW).posture).toBe('unbooked');
  });
});

describe('halPlan — when Hal is going or has gone', () => {
  it('is booked for an auto-policy meeting, and offers no second send', () => {
    const plan = halPlan(entry({ status: 'scheduled', policy: 'auto' }), NOW);
    expect(plan.posture).toBe('booked');
    expect(plan.sendable).toBe(false);
  });

  it('says it is due when an auto meeting is already running', () => {
    const running = entry({
      status: 'scheduled',
      policy: 'auto',
      start: new Date('2026-08-19T11:30:00Z'),
      end: new Date('2026-08-19T12:30:00Z'),
    });
    expect(halPlan(running, NOW).headline).toMatch(/due/);
  });

  it('marks join and disclose done while a live meeting transcribes', () => {
    const plan = halPlan(entry({ status: 'in-progress', policy: 'auto' }), NOW);
    expect(plan.posture).toBe('live');
    expect(plan.stages.map((s) => s.state)).toEqual([
      'done',
      'done',
      'active',
      'active',
      'pending',
      'pending',
      'pending',
    ]);
  });

  it('has exactly one active stage while joining', () => {
    const plan = halPlan(entry({ status: 'joining', policy: 'auto' }), NOW);
    expect(plan.stages.filter((s) => s.state === 'active')).toHaveLength(1);
    expect(plan.headline).toMatch(/admit the guest named Hal/);
  });

  it('completes every stage once the meeting is done', () => {
    const plan = halPlan(entry({ status: 'completed', policy: 'auto' }), NOW);
    expect(plan.posture).toBe('done');
    expect(plan.stages.every((s) => s.state === 'done')).toBe(true);
  });
});

describe('halPlan — failure', () => {
  it('surfaces the agent’s own reason verbatim', () => {
    const plan = halPlan(
      entry({ status: 'failed', policy: 'auto', failureReason: 'Never admitted from the lobby.' }),
      NOW,
    );
    expect(plan.posture).toBe('failed');
    expect(plan.reason).toBe('Never admitted from the lobby.');
    expect(plan.sendable).toBe(true);
  });

  it('says no reason was recorded rather than inventing one', () => {
    const plan = halPlan(entry({ status: 'failed', policy: 'auto' }), NOW);
    expect(plan.reason).toMatch(/did not record a reason/);
  });

  it('does not claim stages succeeded when the run failed at an unknown point', () => {
    const plan = halPlan(entry({ status: 'failed', policy: 'auto' }), NOW);
    expect(plan.stages.some((s) => s.state === 'done')).toBe(false);
  });
});

describe('halPlan — the stage list itself', () => {
  it('describes the agent pipeline in order', () => {
    expect(halPlan(entry(), NOW).stages.map((s) => s.key)).toEqual([
      'join',
      'disclose',
      'capture',
      'transcribe',
      'summarise',
      'store',
      'email',
    ]);
  });

  it('gives every stage a title and a detail in every posture', () => {
    const postures = [
      entry({ joinable: false, url: null, platform: null }),
      entry(),
      entry({ status: 'in-progress', policy: 'auto' }),
      entry({ status: 'completed', policy: 'auto' }),
    ];
    for (const candidate of postures) {
      for (const stage of halPlan(candidate, NOW).stages) {
        expect(stage.title.length).toBeGreaterThan(0);
        expect(stage.detail.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('halPlan — meetings that have already gone past', () => {
  // NOW is 12:00; this one finished at 10:30.
  const past = {
    start: new Date('2026-08-19T10:00:00Z'),
    end: new Date('2026-08-19T10:30:00Z'),
  };

  it('does not offer to send Hal into a meeting that has ended', () => {
    const plan = halPlan(entry({ ...past, status: 'scheduled', policy: 'ask' }), NOW);
    expect(plan.posture).toBe('missed');
    expect(plan.sendable).toBe(false);
    expect(plan.headline).toMatch(/already ended/);
  });

  it('says a booked meeting never ran, rather than that it is still coming', () => {
    const plan = halPlan(entry({ ...past, status: 'scheduled', policy: 'auto' }), NOW);
    expect(plan.posture).toBe('missed');
    expect(plan.reason).toMatch(/never ran/);
  });

  it('does not claim any stage happened for a missed meeting', () => {
    const plan = halPlan(entry({ ...past, status: 'scheduled' }), NOW);
    expect(plan.stages.every((s) => s.state === 'blocked')).toBe(true);
  });

  it('ends an endless meeting an hour after it started, matching isLive', () => {
    const endless = { start: new Date('2026-08-19T09:00:00Z'), end: null };
    expect(halPlan(entry({ ...endless }), NOW).posture).toBe('missed');

    // Half an hour in, it is still joinable.
    const recent = { start: new Date('2026-08-19T11:30:00Z'), end: null };
    expect(halPlan(entry({ ...recent }), NOW).posture).toBe('unbooked');
  });

  it('still reports a completed run as completed once the meeting is over', () => {
    // The meeting ending must not overwrite a fact about a run that happened.
    const plan = halPlan(entry({ ...past, status: 'completed', policy: 'auto' }), NOW);
    expect(plan.posture).toBe('done');
  });

  it('stops claiming Hal is live in a meeting that finished hours ago', () => {
    const plan = halPlan(entry({ ...past, status: 'in-progress', policy: 'auto' }), NOW);
    expect(plan.posture).toBe('stalled');
    expect(plan.headline).toMatch(/never reported back/);
    expect(plan.sendable).toBe(false);
  });

  it('does the same for a run stuck at joining', () => {
    expect(halPlan(entry({ ...past, status: 'joining', policy: 'auto' }), NOW).posture).toBe(
      'stalled',
    );
  });

  it('keeps only the stages the stalled status actually evidences', () => {
    // 'in-progress' is written after join and disclose, so those two happened.
    // 'joining' evidences nothing beyond an attempt. Neither leaves anything
    // "pending" — nothing is going to advance it now.
    const midRun = halPlan(entry({ ...past, status: 'in-progress' }), NOW);
    expect(midRun.stages.map((s) => s.state)).toEqual([
      'done',
      'done',
      'blocked',
      'blocked',
      'blocked',
      'blocked',
      'blocked',
    ]);

    const neverIn = halPlan(entry({ ...past, status: 'joining' }), NOW);
    expect(neverIn.stages.every((s) => s.state === 'blocked')).toBe(true);
  });

  it('offers no retry on a failed run once the meeting is over', () => {
    const over = halPlan(entry({ ...past, status: 'failed', policy: 'auto' }), NOW);
    expect(over.sendable).toBe(false);

    const stillToCome = halPlan(entry({ status: 'failed', policy: 'auto' }), NOW);
    expect(stillToCome.sendable).toBe(true);
  });

  it('distinguishes a live meeting Hal is absent from, from one still to come', () => {
    const running = entry({
      start: new Date('2026-08-19T11:30:00Z'),
      end: new Date('2026-08-19T12:30:00Z'),
    });
    expect(halPlan(running, NOW).headline).toMatch(/running now/);
    expect(halPlan(entry(), NOW).headline).toMatch(/not booked/);
  });
});
