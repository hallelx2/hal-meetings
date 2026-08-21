/**
 * Google Meet join links.
 *
 * Moved here from the web app so the agent and the web app cannot disagree
 * about what counts as a Meet link — they were about to, the moment Zoom
 * became joinable and the two sides needed the same answer.
 */

const MEET_HOST = /(^|\.)meet\.google\.com$/i;
const MEET_CODE = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/i;

export type MeetLink = {
  /** `abc-defg-hij`, lowercased. */
  code: string;
  /** Canonical join URL. */
  joinUrl: string;
};

/**
 * Parse a Meet URL, or null.
 *
 * Deliberately strict about the code shape: Meet URLs also carry lookup paths
 * (`/lookup/...`) and marketing pages, and joining one of those puts the agent
 * on a page it will sit on until the admission timeout rather than failing
 * cleanly.
 */
export function parseMeetUrl(raw: string): MeetLink | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:') return null;
  if (!MEET_HOST.test(url.hostname)) return null;

  const code = url.pathname.replace(/^\//, '').split('/')[0] ?? '';
  if (!MEET_CODE.test(code)) return null;

  const lower = code.toLowerCase();
  return { code: lower, joinUrl: `https://meet.google.com/${lower}` };
}

export function isMeetUrl(raw: string): boolean {
  return parseMeetUrl(raw) !== null;
}
