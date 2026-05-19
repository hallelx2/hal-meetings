import { describe, it, expect } from 'bun:test';
import {
  transcriptToMarkdown,
  transcriptToJson,
  transcriptFromJson,
  transcriptToPromptForm,
  type Transcript,
} from '../src/transcript';
import { summaryToMarkdown, type MeetingSummary } from '../src/summarize';

const sample: Transcript = {
  version: 1,
  startedAt: '2026-05-19T11:00:00Z',
  endedAt: '2026-05-19T11:42:00Z',
  durationSec: 2520,
  language: 'en',
  sttProvider: 'whisper-local',
  speakers: ['speaker_0', 'speaker_1', 'speaker_2'],
  lines: [
    { id: 'l1', speaker: 'speaker_0', speakerName: 'Maya', startSec: 0, endSec: 5, text: 'Launch slipped a week.' },
    { id: 'l2', speaker: 'speaker_1', speakerName: 'Hal', startSec: 5, endSec: 12, text: 'Noted. I will update the launch doc.', byHal: true },
    { id: 'l3', speaker: 'speaker_0', speakerName: 'Maya', startSec: 12, endSec: 20, text: 'Thanks. Also QA signed off this morning.' },
  ],
};

describe('transcript serialization', () => {
  it('round-trips JSON faithfully', () => {
    const s = transcriptToJson(sample);
    const t2 = transcriptFromJson(s);
    expect(t2).toEqual(sample);
  });

  it('rejects unsupported versions', () => {
    expect(() => transcriptFromJson('{"version":99}')).toThrow();
  });

  it('renders markdown with timestamps and Hal marker', () => {
    const md = transcriptToMarkdown(sample);
    expect(md).toContain('# Meeting transcript');
    expect(md).toContain('Hal · AI');
    expect(md).toContain('[0:00]');
    expect(md).toContain('Launch slipped');
  });

  it('collapses same-speaker turns in prompt form', () => {
    const t: Transcript = {
      ...sample,
      lines: [
        { id: '1', speaker: 'speaker_0', speakerName: 'Maya', startSec: 0, endSec: 3, text: 'one.' },
        { id: '2', speaker: 'speaker_0', speakerName: 'Maya', startSec: 3, endSec: 6, text: 'two.' },
        { id: '3', speaker: 'speaker_1', speakerName: 'Hal', startSec: 6, endSec: 9, text: 'three.' },
      ],
    };
    const p = transcriptToPromptForm(t);
    expect(p).toBe('Maya: one. two.\n\nHal: three.');
  });
});

describe('summary markdown', () => {
  it('renders all sections', () => {
    const s: MeetingSummary = {
      overview: 'Launch slipped a week. QA passed.',
      decisions: ['Move release announcement to next Friday'],
      actionItems: [{ owner: 'Hal', task: 'update launch doc', due: 'today' }],
      openQuestions: ['Should support be CC\'d?'],
      attendees: ['Maya', 'Hal'],
      risks: [],
    };
    const md = summaryToMarkdown(s);
    expect(md).toContain('## Summary');
    expect(md).toContain('Launch slipped');
    expect(md).toContain('### Decisions');
    expect(md).toContain('### Action items');
    expect(md).toContain('**Hal**');
    expect(md).toContain('_(due today)_');
    expect(md).toContain('### Open questions');
    expect(md).not.toContain('### Risks raised'); // empty section skipped
  });
});
