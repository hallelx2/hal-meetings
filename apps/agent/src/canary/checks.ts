/**
 * The assertions a canary run makes, as pure functions.
 *
 * Kept separate from the run itself so the judgements can be tested without a
 * browser, a meeting, or a network. What counts as "audio arrived" is a real
 * decision with a real threshold, and it deserves to be examined rather than
 * buried in a callback.
 */

export type StepName =
  | 'join'
  | 'admitted'
  | 'disclosed'
  | 'audio'
  | 'transcript'
  | 'left';

export type StepResult = {
  step: StepName;
  ok: boolean;
  /** Why it failed, or what it observed when it passed. */
  detail: string;
};

export type CanaryReport = {
  ok: boolean;
  steps: StepResult[];
  /** The first failure, which is the one worth putting in an alert subject. */
  firstFailure: StepResult | null;
};

/**
 * Is this PCM actually sound, or is it a well-formed recording of nothing?
 *
 * This is the check the whole canary exists for. A headless browser produced
 * exactly the right number of bytes at exactly the right sample rate for thirty
 * minutes, and every one of them was zero — the sink was running, the capture
 * process was healthy, and the meeting was silent. Byte count alone would have
 * reported that as a pass.
 *
 * The threshold is a fraction of *non-zero samples*, not amplitude: room tone,
 * codec noise and speech all clear it easily, while digital silence cannot. A
 * genuinely quiet room still produces dither; a broken audio path produces
 * literal zeroes.
 */
export function audioIsSilent(pcm: Uint8Array, minNonZeroRatio = 0.01): boolean {
  if (pcm.length === 0) return true;

  let nonZero = 0;
  // s16le: two bytes per sample. A sample is non-zero if either byte is.
  for (let i = 0; i + 1 < pcm.length; i += 2) {
    if (pcm[i] !== 0 || pcm[i + 1] !== 0) nonZero += 1;
  }

  const samples = Math.floor(pcm.length / 2);
  if (samples === 0) return true;
  return nonZero / samples < minNonZeroRatio;
}

/** Peak amplitude, for reporting how loud "not silent" actually was. */
export function peakAmplitude(pcm: Uint8Array): number {
  let peak = 0;
  for (let i = 0; i + 1 < pcm.length; i += 2) {
    // s16le, little-endian signed.
    const raw = (pcm[i]! | (pcm[i + 1]! << 8)) << 16 >> 16;
    const magnitude = Math.abs(raw);
    if (magnitude > peak) peak = magnitude;
  }
  return peak;
}

export function step(name: StepName, ok: boolean, detail: string): StepResult {
  return { step: name, ok, detail };
}

/**
 * Collapse the steps into a verdict.
 *
 * The first failure is singled out because it is the only one that is reliably
 * meaningful: once a step fails the later ones are describing a broken run, and
 * an alert that leads with "transcript: no lines" when the real story is
 * "admitted: refused" sends the reader to the wrong place.
 */
export function summarize(steps: StepResult[]): CanaryReport {
  const firstFailure = steps.find((s) => !s.ok) ?? null;
  return { ok: firstFailure === null, steps, firstFailure };
}

/** One line per step, for a log or an alert body. */
export function formatReport(report: CanaryReport): string {
  const lines = report.steps.map((s) => `${s.ok ? 'PASS' : 'FAIL'}  ${s.step.padEnd(11)} ${s.detail}`);
  const verdict = report.ok
    ? 'CANARY PASS — the full pipeline works'
    : `CANARY FAIL at "${report.firstFailure?.step}" — ${report.firstFailure?.detail}`;
  return [verdict, ...lines].join('\n');
}
