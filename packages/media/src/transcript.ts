/**
 * The canonical transcript data model. Every STT provider normalizes its
 * output to this shape so downstream code (summarizer, dashboard, email)
 * doesn't care which provider produced it.
 */

export interface TranscriptLine {
  /** Stable id within this transcript. */
  id: string;
  /** Speaker label from diarization. "speaker_0", "speaker_1", or a human name once resolved. */
  speaker: string;
  /** Optional resolved-from-attendees display name. */
  speakerName?: string;
  /** Start time in seconds from meeting start. */
  startSec: number;
  /** End time in seconds from meeting start. */
  endSec: number;
  /** Final transcribed text for this segment. */
  text: string;
  /** STT confidence 0..1. */
  confidence?: number;
  /** Was this line spoken by Hal (the bot)? */
  byHal?: boolean;
}

export interface Transcript {
  /** Format version — bump if line shape changes. */
  version: 1;
  /** When the meeting actually started. */
  startedAt: string; // ISO-8601
  /** When the meeting ended (or transcript finalized). */
  endedAt: string;
  /** Diarized lines in chronological order. */
  lines: TranscriptLine[];
  /** STT provider that produced this. */
  sttProvider: string;
  /** Language code (ISO 639-1). */
  language: string;
  /** Total meeting duration in seconds. */
  durationSec: number;
  /** Distinct speakers found. */
  speakers: string[];
  /** Free-form provider metadata. */
  meta?: Record<string, unknown>;
}

/** Serialize a transcript to a stable, human-readable markdown form. */
export function transcriptToMarkdown(t: Transcript): string {
  const head = [
    `# Meeting transcript`,
    ``,
    `**Started:** ${t.startedAt}`,
    `**Ended:** ${t.endedAt}`,
    `**Duration:** ${formatDuration(t.durationSec)}`,
    `**Language:** ${t.language}`,
    `**Speakers:** ${t.speakers.join(', ') || '(none)'}`,
    `**STT provider:** ${t.sttProvider}`,
    ``,
    `---`,
    ``,
  ].join('\n');

  const body = t.lines
    .map((l) => {
      const ts = `[${formatDuration(l.startSec)}]`;
      const speaker = l.speakerName ?? l.speaker;
      const marker = l.byHal ? ' · _Hal · AI_' : '';
      return `**${speaker}** ${ts}${marker}\n${l.text}\n`;
    })
    .join('\n');

  return head + body;
}

/** Serialize to JSON for storage (DB encryption wraps this). */
export function transcriptToJson(t: Transcript): string {
  return JSON.stringify(t);
}

export function transcriptFromJson(s: string): Transcript {
  const parsed = JSON.parse(s) as Transcript;
  if (parsed.version !== 1) {
    throw new Error(`[@hal/media] unsupported transcript version: ${parsed.version}`);
  }
  return parsed;
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Reduce a transcript to its essential token-shaped summary input.
 * Strips timestamps, collapses adjacent same-speaker lines.
 */
export function transcriptToPromptForm(t: Transcript): string {
  const merged: { speaker: string; text: string }[] = [];
  for (const l of t.lines) {
    const last = merged[merged.length - 1];
    const speaker = l.speakerName ?? l.speaker;
    if (last && last.speaker === speaker) {
      last.text += ' ' + l.text;
    } else {
      merged.push({ speaker, text: l.text });
    }
  }
  return merged.map((m) => `${m.speaker}: ${m.text}`).join('\n\n');
}
