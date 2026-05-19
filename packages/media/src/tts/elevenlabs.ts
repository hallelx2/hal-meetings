import type { TtsProvider, TtsSynthesizeOpts, TtsResult } from './types';
import { ProviderNotConfiguredError } from '../errors';

export interface ElevenLabsOptions {
  apiKey: string;
  /** Default voice id. */
  defaultVoiceId?: string;
  endpoint?: string;
}

/**
 * ElevenLabs TTS. Production-quality voice for Phase 3 speak-on-behalf.
 * Voice cloning is gated behind the consent flow defined in user policy —
 * see the architecture doc.
 */
export class ElevenLabsTts implements TtsProvider {
  readonly name = 'elevenlabs';
  private readonly endpoint: string;

  constructor(private readonly opts: ElevenLabsOptions) {
    if (!opts.apiKey) throw new ProviderNotConfiguredError('elevenlabs', 'apiKey');
    this.endpoint = opts.endpoint ?? 'https://api.elevenlabs.io';
  }

  async synthesize(opts: TtsSynthesizeOpts): Promise<TtsResult> {
    const voiceId = opts.voiceId ?? this.opts.defaultVoiceId;
    if (!voiceId) throw new ProviderNotConfiguredError('elevenlabs', 'voiceId');

    const url = `${this.endpoint}/v1/text-to-speech/${encodeURIComponent(voiceId)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': this.opts.apiKey,
        'content-type': 'application/json',
        accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: opts.text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!res.ok) {
      throw new Error(`[@hal/media] elevenlabs HTTP ${res.status}: ${await res.text()}`);
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    return { audio: buf, format: 'mp3' };
  }
}
