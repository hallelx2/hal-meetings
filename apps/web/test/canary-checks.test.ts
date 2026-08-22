import { describe, expect, it } from 'bun:test';
import {
  audioIsSilent,
  formatReport,
  peakAmplitude,
  step,
  summarize,
} from '../../agent/src/canary/checks';

/** s16le little-endian buffer from signed sample values. */
function pcm(samples: number[]): Uint8Array {
  const out = new Uint8Array(samples.length * 2);
  samples.forEach((value, i) => {
    out[i * 2] = value & 0xff;
    out[i * 2 + 1] = (value >> 8) & 0xff;
  });
  return out;
}

function silence(count: number): Uint8Array {
  return pcm(new Array(count).fill(0));
}

function tone(count: number, amplitude = 8000): Uint8Array {
  return pcm(
    Array.from({ length: count }, (_, i) => Math.round(amplitude * Math.sin(i / 4))),
  );
}

describe('audioIsSilent', () => {
  it('calls a perfectly-sized buffer of zeroes silent', () => {
    // The exact production failure: headless Chromium produced 128,000 bytes in
    // four seconds — the correct byte rate — and every one was zero. Any check
    // based on volume of data would have passed this.
    expect(audioIsSilent(silence(64_000))).toBe(true);
  });

  it('accepts real audio', () => {
    expect(audioIsSilent(tone(16_000))).toBe(false);
  });

  it('accepts quiet audio, because a quiet room is not a broken audio path', () => {
    // Amplitude 3 is inaudible, but it is dither — something is being rendered.
    // Digital silence is the only thing that means the path is dead.
    expect(audioIsSilent(pcm(Array.from({ length: 16_000 }, (_, i) => (i % 2 ? 3 : -3))))).toBe(
      false,
    );
  });

  it('treats an empty buffer as silent rather than as unknown', () => {
    // Nothing captured is a failure, not an inconclusive result.
    expect(audioIsSilent(new Uint8Array())).toBe(true);
  });

  it('is not fooled by a brief blip in an otherwise dead stream', () => {
    // 20 live samples in 16,000 is 0.125% — below the 1% floor. A single pop
    // as the sink opens must not certify half an hour of silence.
    const mostlyDead = new Uint8Array(32_000);
    for (let i = 0; i < 20; i += 1) mostlyDead[i * 2] = 0x40;
    expect(audioIsSilent(mostlyDead)).toBe(true);
  });

  it('honours a caller-supplied threshold', () => {
    const sparse = new Uint8Array(2_000);
    for (let i = 0; i < 20; i += 1) sparse[i * 2] = 0x40; // 2% of 1000 samples
    expect(audioIsSilent(sparse, 0.05)).toBe(true);
    expect(audioIsSilent(sparse, 0.01)).toBe(false);
  });

  it('ignores a trailing odd byte instead of misreading it as a sample', () => {
    expect(audioIsSilent(new Uint8Array([0, 0, 0, 0, 0x7f]))).toBe(true);
  });
});

describe('peakAmplitude', () => {
  it('is zero for silence', () => {
    expect(peakAmplitude(silence(100))).toBe(0);
  });

  it('reads negative samples at their magnitude', () => {
    expect(peakAmplitude(pcm([-12_000, 5, -3]))).toBe(12_000);
  });
});

describe('summarize', () => {
  it('passes only when every step passed', () => {
    const report = summarize([step('join', true, 'ok'), step('audio', true, 'peak 9000')]);
    expect(report.ok).toBe(true);
    expect(report.firstFailure).toBeNull();
  });

  it('reports the first failure, not the last', () => {
    // Once a step fails the later ones describe a broken run. Leading an alert
    // with "no transcript" when the truth is "never admitted" sends the reader
    // to the wrong place.
    const report = summarize([
      step('join', true, 'clicked'),
      step('admitted', false, 'refused'),
      step('transcript', false, 'no lines'),
    ]);
    expect(report.ok).toBe(false);
    expect(report.firstFailure?.step).toBe('admitted');
  });
});

describe('formatReport', () => {
  it('leads with the verdict and names the failing step', () => {
    const text = formatReport(
      summarize([step('join', true, 'clicked'), step('audio', false, 'silence: 0 non-zero')]),
    );
    expect(text.split('\n')[0]).toContain('CANARY FAIL');
    expect(text.split('\n')[0]).toContain('audio');
    expect(text).toContain('PASS');
    expect(text).toContain('FAIL');
  });

  it('says plainly when everything works', () => {
    expect(formatReport(summarize([step('join', true, 'ok')]))).toStartWith('CANARY PASS');
  });
});
