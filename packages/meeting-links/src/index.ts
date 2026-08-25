export { parseMeetUrl, isMeetUrl, type MeetLink } from './meet';
export { parseZoomUrl, isZoomUrl, type ZoomLink } from './zoom';
export { DEFAULT_BOT_NAME_TEMPLATE, MAX_BOT_NAME_LENGTH, renderBotName } from './bot';

import { parseMeetUrl } from './meet';
import { parseZoomUrl } from './zoom';

export type JoinablePlatform = 'meet' | 'zoom';

export type JoinableLink = {
  platform: JoinablePlatform;
  /** What a human should see, and what gets stored as the meeting's URL. */
  url: string;
  /** What the browser runtime should actually navigate to. */
  navigateUrl: string;
};

/**
 * Resolve any pasted link into something Hal can join, or null.
 *
 * The `url`/`navigateUrl` split exists for Zoom: the link worth storing and
 * showing is the `/j/` one the invitation used, but the link worth *navigating*
 * to is the web client. Collapsing them would either show the user a URL they
 * did not recognise, or send the browser to the app-launcher interstitial.
 */
export function parseJoinableUrl(raw: string): JoinableLink | null {
  const meet = parseMeetUrl(raw);
  if (meet) {
    return { platform: 'meet', url: meet.joinUrl, navigateUrl: meet.joinUrl };
  }

  const zoom = parseZoomUrl(raw);
  if (zoom) {
    return { platform: 'zoom', url: zoom.joinUrl, navigateUrl: zoom.webClientUrl };
  }

  return null;
}

/**
 * Drop punctuation the sentence owns rather than the URL.
 *
 * Links arrive mid-prose — "join at https://meet.google.com/abc-defg-hij." or
 * "(see https://zoom.us/j/123)" — and the trailing character belongs to the
 * writer, not the address. Meet codes are strictly `xxx-xxxx-xxx`, so a
 * trailing full stop is not a near-miss, it is a hard parse failure.
 *
 * Brackets are only stripped when unbalanced, so a genuinely parenthesised path
 * survives.
 */
export function trimTrailingPunctuation(url: string): string {
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

/**
 * The first link in a block of prose that Hal can actually join.
 *
 * A chat message is prose with a link somewhere in it, so candidates are
 * extracted first and each is trimmed before parsing — otherwise a message
 * ending in a full stop yields nothing at all.
 */
export function findJoinableInText(text: string): JoinableLink | null {
  for (const candidate of text.match(/https?:\/\/[^\s<>"']+/gi) ?? []) {
    const link = parseJoinableUrl(trimTrailingPunctuation(candidate));
    if (link) return link;
  }
  return null;
}
