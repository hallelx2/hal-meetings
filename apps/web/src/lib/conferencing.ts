/**
 * Working out what kind of call a calendar event is, and whether Hal can join it.
 *
 * Pure and client-safe: the dashboard badges events with this, and the sync
 * writes rows with it, so both sides must agree on what counts as a Meet link.
 */

/** Platforms Hal can recognise. Only `meet` is joinable today. */
export type ConferencePlatform = 'meet' | 'zoom' | 'teams';

export type Conferencing = {
  platform: ConferencePlatform;
  url: string;
  /**
   * Whether Hal can actually join. Zoom and Teams are detected and shown so the
   * roadmap is legible — hiding them would read as "Hal saw nothing", which is
   * a different and more worrying message than "Hal can't do this one yet".
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

const MATCHERS: Array<{ platform: ConferencePlatform; pattern: RegExp; joinable: boolean }> = [
  { platform: 'meet', pattern: MEET, joinable: true },
  { platform: 'zoom', pattern: ZOOM, joinable: false },
  { platform: 'teams', pattern: TEAMS, joinable: false },
];

function firstMatch(text: string | null | undefined): Conferencing | null {
  if (!text) return null;
  for (const { platform, pattern, joinable } of MATCHERS) {
    const found = text.match(pattern);
    if (found?.[0]) return { platform, url: found[0], joinable };
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
