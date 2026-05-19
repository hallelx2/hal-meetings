import WebSocket from 'ws';
import type { SttProvider, SttSession, SttStreamOpts, SttEvent } from './types';
import type { Transcript, TranscriptLine } from '../transcript';
import { ProviderNotConfiguredError, SttStreamClosedError, TranscriptionFailedError } from '../errors';

export interface DeepgramOptions {
  /** Deepgram API key. */
  apiKey: string;
  /** Model name. Default 'nova-2-meeting'. */
  model?: string;
  /** Endpoint URL. Default is deepgram's hosted. */
  endpoint?: string;
}

interface DeepgramAlternative {
  transcript: string;
  confidence: number;
  words?: { word: string; speaker?: number; start: number; end: number }[];
}
interface DeepgramMsg {
  channel?: { alternatives?: DeepgramAlternative[] };
  start?: number;
  duration?: number;
  speech_final?: boolean;
  is_final?: boolean;
  type?: string;
}

/**
 * Deepgram streaming STT. Production path — real-time partial and final
 * transcript events with speaker diarization. WebSocket protocol described
 * at https://developers.deepgram.com/docs/live-streaming-audio.
 */
export class DeepgramStt implements SttProvider {
  readonly name = 'deepgram';

  constructor(private readonly opts: DeepgramOptions) {
    if (!opts.apiKey) throw new ProviderNotConfiguredError('deepgram', 'apiKey');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async startStream(opts?: SttStreamOpts): Promise<SttSession> {
    const sampleRate = opts?.sampleRate ?? 16000;
    const encoding = opts?.encoding === 'opus' ? 'opus' : 'linear16';
    const channels = opts?.channels ?? 1;
    const language = opts?.language ?? 'en';
    const diarize = opts?.diarize ?? true;

    const url = new URL(this.opts.endpoint ?? 'wss://api.deepgram.com/v1/listen');
    url.searchParams.set('model', this.opts.model ?? 'nova-2-meeting');
    url.searchParams.set('encoding', encoding);
    url.searchParams.set('sample_rate', String(sampleRate));
    url.searchParams.set('channels', String(channels));
    url.searchParams.set('language', language);
    url.searchParams.set('punctuate', 'true');
    url.searchParams.set('smart_format', 'true');
    if (diarize) url.searchParams.set('diarize', 'true');
    if (opts?.filterProfanity) url.searchParams.set('profanity_filter', 'true');

    const ws = new WebSocket(url.toString(), {
      headers: { Authorization: `Token ${this.opts.apiKey}` },
    });

    const handlers = new Set<(e: SttEvent) => void>();
    const emit = (e: SttEvent) => {
      for (const h of handlers) h(e);
    };

    const finalLines: TranscriptLine[] = [];
    const startedAt = new Date();
    const modelName = this.opts.model ?? 'nova-2-meeting';
    let closed = false;
    let idCounter = 0;

    await new Promise<void>((resolve, reject) => {
      ws.once('open', () => resolve());
      ws.once('error', (err) => reject(new TranscriptionFailedError('deepgram', 'connect failed', err)));
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw)) as DeepgramMsg;
        const alt = msg.channel?.alternatives?.[0];
        if (!alt || !alt.transcript) return;
        const startSec = msg.start ?? 0;
        const endSec = (msg.start ?? 0) + (msg.duration ?? 0);
        const speaker = pickSpeaker(alt);
        const line: TranscriptLine = {
          id: `dg-${idCounter++}`,
          speaker: `speaker_${speaker}`,
          startSec,
          endSec,
          text: alt.transcript,
          confidence: alt.confidence,
        };
        if (msg.is_final) {
          finalLines.push(line);
          emit({ kind: 'final', line });
        } else {
          emit({ kind: 'partial', line });
        }
      } catch (e) {
        emit({ kind: 'error', error: e as Error });
      }
    });

    ws.on('close', () => {
      closed = true;
      emit({ kind: 'closed' });
    });
    ws.on('error', (err) => emit({ kind: 'error', error: err }));

    return {
      write(pcm: Uint8Array) {
        if (closed) throw new SttStreamClosedError();
        ws.send(pcm);
      },
      on(handler) {
        handlers.add(handler);
        return () => handlers.delete(handler);
      },
      async end(): Promise<Transcript> {
        if (!closed) {
          // Deepgram protocol — empty binary frame signals stream end.
          ws.send(JSON.stringify({ type: 'CloseStream' }));
          await new Promise<void>((resolve) => {
            if (closed) return resolve();
            ws.once('close', () => resolve());
          });
        }
        const speakers = Array.from(new Set(finalLines.map((l) => l.speaker)));
        const durationSec = finalLines.length > 0 ? finalLines[finalLines.length - 1]!.endSec : 0;
        return {
          version: 1,
          startedAt: startedAt.toISOString(),
          endedAt: new Date().toISOString(),
          lines: finalLines,
          sttProvider: 'deepgram',
          language,
          durationSec,
          speakers,
          meta: { model: modelName },
        };
      },
      async abort() {
        closed = true;
        ws.terminate();
      },
    } satisfies SttSession;
  }
}

function pickSpeaker(alt: DeepgramAlternative): number {
  if (!alt.words || alt.words.length === 0) return 0;
  const counts = new Map<number, number>();
  for (const w of alt.words) {
    const s = w.speaker ?? 0;
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  let best = 0;
  let bestCount = -1;
  for (const [s, c] of counts) {
    if (c > bestCount) {
      best = s;
      bestCount = c;
    }
  }
  return best;
}
