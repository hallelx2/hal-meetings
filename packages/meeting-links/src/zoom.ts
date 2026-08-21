/**
 * Zoom join links, and turning one into something a browser can actually join.
 *
 * A Zoom invitation carries a `/j/` link, which is a *launcher*: it renders an
 * interstitial whose whole purpose is to hand off to the desktop app, and only
 * offers a "Join from your browser" link as a fallback that is sometimes hidden
 * behind a second click and sometimes absent. Automating that page is a losing
 * game against a page designed to send you elsewhere.
 *
 * `/wc/join/` is the web client directly. Rewriting the URL before navigating
 * means the browser never sees the launcher, so there is no app-handoff to
 * dodge and no fallback link to hunt for.
 */

export type ZoomLink = {
  /** Numeric meeting ID, digits only. */
  meetingId: string;
  /**
   * The `pwd` token from the link, if present. This is the encoded passcode
   * Zoom puts in invitations — not the human passcode someone reads out.
   */
  pwd: string | null;
  /** The host the link was issued on: vanity subdomains are real and must be kept. */
  host: string;
  /** Web client URL — what the runtime navigates to. */
  webClientUrl: string;
  /** The canonical `/j/` form, for showing a human. */
  joinUrl: string;
};

/** `zoom.us`, and the vanity subdomains Zoom sells (`acme.zoom.us`). */
const ZOOM_HOST = /^(?:[a-z0-9-]+\.)*zoom\.us$/i;

/**
 * Meeting IDs are 9–11 digits. Zoom prints them in groups ("881 2345 6789"),
 * and people paste them that way, so separators are tolerated on the way in
 * and stripped — but only spaces and dashes, never letters.
 */
const MEETING_ID = /^\d{9,11}$/;

function normaliseId(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, '');
  return MEETING_ID.test(digits) ? digits : null;
}

/**
 * Parse any Zoom URL into the pieces needed to join it.
 *
 * Returns null for anything that is not a Zoom meeting link — a personal-link
 * URL (`/my/name`) included, because those resolve to a room whose numeric ID
 * is not in the URL and cannot be derived without asking Zoom.
 */
export function parseZoomUrl(raw: string): ZoomLink | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:') return null;
  if (!ZOOM_HOST.test(url.hostname)) return null;

  // `/j/<id>`, `/s/<id>` (start link), `/w/<id>` (webinar), `/wc/join/<id>`,
  // and `/wc/<id>/join` are all forms seen in the wild.
  const segments = url.pathname.split('/').filter(Boolean);
  let idSegment: string | null = null;

  if (segments[0] === 'wc') {
    // /wc/join/<id>  or  /wc/<id>/join
    idSegment = segments[1] === 'join' ? (segments[2] ?? null) : (segments[1] ?? null);
  } else if (segments[0] && ['j', 's', 'w'].includes(segments[0])) {
    idSegment = segments[1] ?? null;
  }

  if (!idSegment) return null;
  const meetingId = normaliseId(idSegment);
  if (!meetingId) return null;

  const pwd = url.searchParams.get('pwd');
  const host = url.hostname.toLowerCase();

  const webClient = new URL(`https://${host}/wc/join/${meetingId}`);
  if (pwd) webClient.searchParams.set('pwd', pwd);

  const join = new URL(`https://${host}/j/${meetingId}`);
  if (pwd) join.searchParams.set('pwd', pwd);

  return {
    meetingId,
    pwd,
    host,
    webClientUrl: webClient.toString(),
    joinUrl: join.toString(),
  };
}

/** Is this a Zoom meeting link Hal can attempt? */
export function isZoomUrl(raw: string): boolean {
  return parseZoomUrl(raw) !== null;
}
