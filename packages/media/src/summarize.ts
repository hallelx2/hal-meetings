import type { LlmProvider } from './llm/types';
import type { Transcript } from './transcript';
import { transcriptToPromptForm } from './transcript';

export interface MeetingSummary {
  /** A 1-paragraph overview suitable for an email preview. */
  overview: string;
  /** Decisions explicitly made (or surfaced) during the meeting. */
  decisions: string[];
  /** Action items with optional assignee. */
  actionItems: Array<{ owner?: string; task: string; due?: string }>;
  /** Open questions left unresolved. */
  openQuestions: string[];
  /** Attendees who spoke. */
  attendees: string[];
  /** Notable risks/blockers raised. */
  risks: string[];
}

const SUMMARY_SCHEMA = `{
  "overview": "string — 2-3 sentence overview",
  "decisions": ["string", ...],
  "actionItems": [{ "owner": "string (optional)", "task": "string", "due": "string (optional)" }],
  "openQuestions": ["string", ...],
  "attendees": ["string", ...],
  "risks": ["string", ...]
}`;

const SYSTEM_PROMPT = `You are Hal, an autonomous meeting agent. You produce concise, faithful summaries of meeting transcripts. Rules:

1. Never invent decisions, attendees, or action items that aren't in the transcript.
2. If something is ambiguous, say so in the "openQuestions" array instead of guessing.
3. Owners must be named exactly as they appear in the transcript.
4. Action items must be concrete and verifiable.
5. "overview" is for an email preview — at most 3 sentences, no fluff.
6. If the meeting was inconsequential (e.g. greetings, no decisions), say so honestly in "overview".
7. Do not summarize Hal's own utterances as decisions or action items.`;

/**
 * Summarize a transcript into the structured MeetingSummary shape using the
 * configured LLM provider. Forces JSON output and validates structure.
 */
export async function summarizeTranscript(
  llm: LlmProvider,
  transcript: Transcript,
): Promise<MeetingSummary> {
  const lines = transcriptToPromptForm(transcript);
  const user = `Transcript follows. Produce the structured summary per the schema.

----- TRANSCRIPT -----
${lines}
----- END TRANSCRIPT -----`;

  return llm.jsonComplete<MeetingSummary>({
    system: SYSTEM_PROMPT,
    user,
    schemaDescription: SUMMARY_SCHEMA,
    maxTokens: 2048,
    temperature: 0,
    validate: validateSummary,
  });
}

function validateSummary(raw: unknown): MeetingSummary {
  if (!raw || typeof raw !== 'object') throw new Error('summary: not an object');
  const r = raw as Record<string, unknown>;
  const isStringArray = (v: unknown): v is string[] =>
    Array.isArray(v) && v.every((x) => typeof x === 'string');

  const overview = typeof r.overview === 'string' ? r.overview : '';
  const decisions = isStringArray(r.decisions) ? r.decisions : [];
  const openQuestions = isStringArray(r.openQuestions) ? r.openQuestions : [];
  const attendees = isStringArray(r.attendees) ? r.attendees : [];
  const risks = isStringArray(r.risks) ? r.risks : [];

  const actionItemsRaw = Array.isArray(r.actionItems) ? r.actionItems : [];
  const actionItems = actionItemsRaw
    .filter((a): a is Record<string, unknown> => typeof a === 'object' && a !== null)
    .map((a) => ({
      ...(typeof a.owner === 'string' ? { owner: a.owner } : {}),
      task: typeof a.task === 'string' ? a.task : '',
      ...(typeof a.due === 'string' ? { due: a.due } : {}),
    }))
    .filter((a) => a.task.length > 0);

  return { overview, decisions, actionItems, openQuestions, attendees, risks };
}

/** Render a summary as markdown for emailing. */
export function summaryToMarkdown(s: MeetingSummary): string {
  const lines: string[] = [];
  lines.push('## Summary', '', s.overview, '');
  if (s.attendees.length > 0) {
    lines.push('**Attendees:** ' + s.attendees.join(', '), '');
  }
  if (s.decisions.length > 0) {
    lines.push('### Decisions');
    for (const d of s.decisions) lines.push(`- ${d}`);
    lines.push('');
  }
  if (s.actionItems.length > 0) {
    lines.push('### Action items');
    for (const a of s.actionItems) {
      const owner = a.owner ? `**${a.owner}** — ` : '';
      const due = a.due ? ` _(due ${a.due})_` : '';
      lines.push(`- ${owner}${a.task}${due}`);
    }
    lines.push('');
  }
  if (s.openQuestions.length > 0) {
    lines.push('### Open questions');
    for (const q of s.openQuestions) lines.push(`- ${q}`);
    lines.push('');
  }
  if (s.risks.length > 0) {
    lines.push('### Risks raised');
    for (const r of s.risks) lines.push(`- ${r}`);
    lines.push('');
  }
  return lines.join('\n');
}
