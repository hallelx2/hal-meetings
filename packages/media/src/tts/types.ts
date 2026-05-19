/**
 * TTS interface. Reserved for Phase 3 (speak-on-behalf) — we only need this
 * once Hal actually speaks. The interface is locked now so the bot worker
 * can be built against it.
 */

export interface TtsSynthesizeOpts {
  text: string;
  voiceId?: string;
  /** Sample rate of the output PCM. Default 16000. */
  sampleRate?: number;
  /** Output format. Default 'pcm-s16le'. */
  format?: 'pcm-s16le' | 'mp3' | 'wav';
  /** Speaking speed multiplier, 1.0 = normal. */
  speed?: number;
}

export interface TtsResult {
  /** Audio bytes in the requested format. */
  audio: Uint8Array;
  /** Format that was actually produced. */
  format: 'pcm-s16le' | 'mp3' | 'wav';
  /** Sample rate if PCM. */
  sampleRate?: number;
  /** Duration in seconds (provider best-effort). */
  durationSec?: number;
}

export interface TtsProvider {
  readonly name: string;
  /** One-shot synthesis. */
  synthesize(opts: TtsSynthesizeOpts): Promise<TtsResult>;
}
