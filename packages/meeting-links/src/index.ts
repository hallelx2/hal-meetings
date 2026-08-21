export { parseMeetUrl, isMeetUrl, type MeetLink } from './meet';
export { parseZoomUrl, isZoomUrl, type ZoomLink } from './zoom';

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
