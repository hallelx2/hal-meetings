import type { Transcript, TranscriptLine } from '../transcript';

export interface SttStreamOpts {
  /** PCM sample rate in Hz. Default 16000. */
  sampleRate?: number;
  /** PCM channels. Default 1 (mono). */
  channels?: number;
  /** Sample format. Default 's16le'. */
  encoding?: 's16le' | 'f32le' | 'opus';
  /** Language hint, ISO 639-1. Default 'en'. */
  language?: string;
  /** Request speaker diarization. Default true. */
  diarize?: boolean;
  /** Filter profanity. Default false. */
  filterProfanity?: boolean;
  /** Hint of attendees so diarization can map labels to names if supported. */
  attendeeNames?: string[];
}

export type SttEvent =
  | { kind: 'partial'; line: TranscriptLine }
  | { kind: 'final'; line: TranscriptLine }
  | { kind: 'error'; error: Error }
  | { kind: 'closed' };

export interface SttSession {
  /** Push a chunk of PCM audio into the stream. */
  write(pcm: Uint8Array): void;
  /** Subscribe to events. Returns an unsubscribe function. */
  on(handler: (event: SttEvent) => void): () => void;
  /** Stop accepting audio and wait for the provider to finalize. */
  end(): Promise<Transcript>;
  /** Force-cancel without finalizing. */
  abort(): Promise<void>;
}

export interface SttProvider {
  /** Provider name (used in transcripts.sttProvider). */
  readonly name: string;
  /** Begin a streaming transcription session. */
  startStream(opts?: SttStreamOpts): Promise<SttSession>;
}
