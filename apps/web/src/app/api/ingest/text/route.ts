import { NextResponse } from 'next/server';
import { findJoinableInText } from '@hal/meeting-links';
import { getEnvelope, getRepos } from '@/server/hal';
import { normalizeEmail } from '@/server/google-oauth';
import { enqueueJoinMeeting } from '@/server/join-meeting';
import { identifyIngestCaller, IngestNotConfiguredError } from '@/server/ingest-auth';

export const dynamic = 'force-dynamic';

/** A message is a message, not a document. Anything longer is not a chat line. */
const MAX_TEXT = 4_000;

/**
 * Find a meeting link in arbitrary text and send Hal to it.
 *
 * Deliberately source-agnostic: it takes text and a label, and knows nothing
 * about where the text came from. A WhatsApp listener, a Telegram bot, an email
 * rule and a shell script are all the same caller from here, which keeps the
 * one thing with legal and ToS weight — how the text was obtained — outside
 * this repository entirely.
 *
 * `dryRun` exists because the first question anyone asks of a listener is
 * "would this have fired?", and answering it by actually sending Hal into a
 * meeting is an expensive way to find out.
 */
export async function POST(request: Request) {
  let caller;
  try {
    caller = identifyIngestCaller(request.headers.get('authorization'));
  } catch (e) {
    if (e instanceof IngestNotConfiguredError) {
      // 501, not 401: the caller did nothing wrong and retrying will not help.
      return NextResponse.json({ error: 'ingest_not_configured' }, { status: 501 });
    }
    throw e;
  }

  if (!caller) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { text?: unknown; source?: unknown; dryRun?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text.slice(0, MAX_TEXT) : '';
  if (!text.trim()) return NextResponse.json({ error: 'no_text' }, { status: 400 });

  const source = typeof body.source === 'string' ? body.source.slice(0, 60) : 'ingest';
  const dryRun = body.dryRun === true;

  // The same parser the dashboard badge and the agent runtime use, so a link
  // this endpoint accepts is a link the joiner can actually handle.
  const link = findJoinableInText(text);
  if (!link) return NextResponse.json({ found: false });

  if (dryRun) {
    return NextResponse.json({ found: true, dryRun: true, platform: link.platform, url: link.url });
  }

  const user = await getRepos().users.findByEmail(normalizeEmail(caller.email));
  if (!user) return NextResponse.json({ error: 'no_hal_user' }, { status: 404 });

  const result = await enqueueJoinMeeting({
    store: getRepos(),
    envelope: getEnvelope(),
    user,
    url: link.url,
    title: `From ${source}`,
  });

  return NextResponse.json({
    found: true,
    platform: link.platform,
    url: link.url,
    meetingId: result.meetingId,
  });
}
