import { NextResponse } from 'next/server';
import {
  summarizeTranscript,
  transcriptFromJson,
  type Transcript,
} from '@hal/media';
import { getLlm } from '@/server/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface SummarizeRequest {
  transcript: Transcript | string;
}

/**
 * POST /api/ai/summarize
 *
 * Body: { transcript: Transcript | string-of-transcript-json }
 * Returns: MeetingSummary
 *
 * The LLM key is held server-side via the LLM_PROVIDER + provider env vars.
 * Browser never sees it.
 */
export async function POST(req: Request) {
  let body: SummarizeRequest;
  try {
    body = (await req.json()) as SummarizeRequest;
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  if (!body?.transcript) {
    return NextResponse.json({ error: 'missing transcript' }, { status: 400 });
  }

  let transcript: Transcript;
  try {
    transcript =
      typeof body.transcript === 'string'
        ? transcriptFromJson(body.transcript)
        : body.transcript;
  } catch (e) {
    return NextResponse.json(
      { error: `transcript parse failed: ${(e as Error).message}` },
      { status: 400 },
    );
  }

  try {
    const llm = getLlm();
    const summary = await summarizeTranscript(llm, transcript);
    return NextResponse.json({ provider: llm.name, summary });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
