import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 * Lightweight health probe. Reports which providers are configured
 * (presence, not values) so deployment problems surface before runtime.
 */
export function GET() {
  return NextResponse.json({
    ok: true,
    version: '0.0.0',
    providers: {
      llm: process.env.LLM_PROVIDER ?? 'ollama',
      stt: process.env.STT_PROVIDER ?? 'whisper-local',
      kms: process.env.KMS_PROVIDER ?? 'local',
    },
    configured: {
      database: Boolean(process.env.DATABASE_URL),
      gemini: Boolean(process.env.GEMINI_API_KEY),
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      deepgram: Boolean(process.env.DEEPGRAM_API_KEY),
      glm: Boolean(process.env.GLM_API_KEY),
      resend: Boolean(process.env.RESEND_API_KEY),
      kmsKey: Boolean(process.env.HAL_LOCAL_KMS_KEY),
    },
  });
}
