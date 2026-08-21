/**
 * Working out what kind of call a calendar event is, and whether Hal can join it.
 *
 * Pure and client-safe: the dashboard badges events with this, and the sync
 * writes rows with it, so both sides must agree on what counts as a Meet link.
 *
 * Detection and joinability are deliberately two different questions answered
 * by two different mechanisms. Detection is a broad regex, because the goal is
 * to notice a Zoom link even when it is malformed and say so. Joinability is
 * `parseJoinableUrl` — the *same* function the join endpoint and the agent
 * runtime use — because a green "Hal can join" badge over a link the joiner
 * will reject is a lie the user only discovers after pressing the button.
 */

import { parseJoinableUrl } from '@hal/meeting-links';

/** Platforms Hal can recognise. `meet` and `zoom` are joinable; Teams is not. */
export type ConferencePlatform = 'meet' | 'zoom' | 'teams';

export type Conferencing = {
  platform: ConferencePlatform;
  url: string;
  /**
   * Whether Hal can actually join, decided by the same parser the joiner uses.
   * Teams is detected and shown so the roadmap is legible — hiding it would
   * read as "Hal saw nothing", which is a different and more worrying message
   * than "Hal can't do this one yet".
   */
  joinable: boolean;
};

/** Shape of the bits of a Google Calendar event we care about. */
export type CalendarEventLike = {
  hangoutLink?: string | null;
  location?: string | null;
  description?: string | null;
  conferenceData?: {
    entryPoints?: Array<{ entryPointType?: string | null; uri?: string | null }> | null;
  } | null;
};

const MEET = /https:\/\/meet\.google\.com\/[a-z0-9-]+/i;
// Zoom sells vanity subdomains, so the host is <anything>.zoom.us as well as zoom.us.
const ZOOM = /https:\/\/(?:[a-z0-9-]+\.)*zoom\.us\/(?:j|w|s|my)\/[^\s<>"]+/i;
const TEAMS = /https:\/\/teams\.(?:microsoft|live)\.com\/[^\s<>"]+/i;

const MATCHERS: Array<{ platform: ConferencePlatform; pattern: RegExp }> = [
  { platform: 'meet', pattern: MEET },
  { platform: 'zoom', pattern: ZOOM },
  { platform: 'teams', pattern: TEAMS },
];

/**
 * Drop punctuation the sentence owns rather than the URL.
 *
 * These links are usually pasted mid-prose — "join at https://acme.zoom.us/j/1,
 * or dial in" — and the broad host patterns would otherwise swallow the comma,
 * the full stop, or the closing bracket, producing a link that 404s. Brackets
 * are only stripped when unbalanced, so a genuinely parenthesised path survives.
 */
function trimTrailingPunctuation(url: string): string {
  let end = url.length;
  while (end > 0) {
    const char = url[end - 1]!;
    if ('.,;:!?\'"'.includes(char)) {
      end -= 1;
      continue;
    }
    if (char === ')' || char === ']' || char === '}') {
      const open = char === ')' ? '(' : char === ']' ? '[' : '{';
      const slice = url.slice(0, end);
      const opens = slice.split(open).length - 1;
      const closes = slice.split(char).length - 1;
      if (closes > opens) {
        end -= 1;
        continue;
      }
    }
    break;
  }
  return url.slice(0, end);
}

function firstMatch(text: string | null | undefined): Conferencing | null {
  if (!text) return null;
  for (const { platform, pattern } of MATCHERS) {
    const found = text.match(pattern);
    if (found?.[0]) {
      const url = trimTrailingPunctuation(found[0]);
      // One source of truth. If the joiner would not take this link, the badge
      // must not promise that it would.
      return { platform, url, joinable: parseJoinableUrl(url) !== null };
    }
  }
  return null;
}

/**
 * Find the conference link on an event, if there is one.
 *
 * Ordered by how much the source can be trusted. `hangoutLink` and
 * `conferenceData` are structured fields Google itself populates; `location`
 * and `description` are free text a human typed, where a link may be stale,
 * a duplicate, or someone else's meeting pasted as a reference. Structured
 * first means a correct event is never mis-read because its description
 * happens to mention another call.
 */
export function detectConferencing(event: CalendarEventLike): Conferencing | null {
  if (event.hangoutLink) {
    const fromHangout = firstMatch(event.hangoutLink);
    if (fromHangout) return fromHangout;
  }

  for (const entry of event.conferenceData?.entryPoints ?? []) {
    if (entry?.entryPointType && entry.entryPointType !== 'video') continue;
    const fromEntry = firstMatch(entry?.uri);
    if (fromEntry) return fromEntry;
  }

  return firstMatch(event.location) ?? firstMatch(event.description);
}
