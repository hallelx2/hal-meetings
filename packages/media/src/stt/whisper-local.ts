import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SttProvider, SttSession, SttStreamOpts, SttEvent } from './types';
import type { Transcript, TranscriptLine } from '../transcript';
import { TranscriptionFailedError } from '../errors';

export interface WhisperLocalOptions {
  /** Path to the whisper.cpp binary (the `main` executable). */
  binaryPath: string;
  /** Path to the ggml model file. */
  modelPath: string;
  /** Number of threads. Defaults to 4. */
  threads?: number;
  /** Extra flags forwarded to whisper.cpp. */
  extraArgs?: string[];
}

interface WhisperJsonSegment {
  start: string; // "00:00:01,200"
  end: string;
  text: string;
  speaker_id?: number;
}

interface WhisperJsonOutput {
  transcription: WhisperJsonSegment[];
  result?: { language?: string };
}

/**
 * Local Whisper.cpp adapter.
 *
 * Architecture: collect the entire PCM stream to a temp WAV file, then run
 * whisper.cpp once at `end()`. Whisper.cpp does not stream natively — true
 * streaming requires a different model (whisper-streaming, vosk, etc.). For
 * Hal Phase 0 this batch-on-end approach is fine; meetings are bounded in
 * length and a single transcription pass per meeting is the normal pattern.
 *
 * For real-time partial results during the meeting, swap in DeepgramStt.
 */
export class WhisperLocalStt implements SttProvider {
  readonly name = 'whisper-local';

  constructor(private readonly opts: WhisperLocalOptions) {}

  // eslint-disable-next-line @typescript-eslint/require-await
  async startStream(opts?: SttStreamOpts): Promise<SttSession> {
    const sampleRate = opts?.sampleRate ?? 16000;
    const channels = opts?.channels ?? 1;
    const language = opts?.language ?? 'en';
    const startedAt = new Date();
    const chunks: Uint8Array[] = [];
    const handlers = new Set<(e: SttEvent) => void>();
    let closed = false;
    let totalBytes = 0;

    const emit = (e: SttEvent) => {
      for (const h of handlers) h(e);
    };

    const finalize = async (): Promise<Transcript> => {
      closed = true;
      const tmp = await mkdtemp(join(tmpdir(), 'hal-whisper-'));
      const wavPath = join(tmp, 'in.wav');
      try {
        const wav = pcmToWav(Buffer.concat(chunks.map((c) => Buffer.from(c))), sampleRate, channels);
        await writeFile(wavPath, wav);

        const args = [
          '-m', this.opts.modelPath,
          '-f', wavPath,
          '-l', language,
          '-t', String(this.opts.threads ?? 4),
          '-oj', // output json
          '-of', join(tmp, 'out'),
          ...(this.opts.extraArgs ?? []),
        ];

        await new Promise<void>((resolve, reject) => {
          const proc = spawn(this.opts.binaryPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
          let stderr = '';
          proc.stderr?.on('data', (b) => (stderr += b.toString()));
          proc.on('error', (e) => reject(new TranscriptionFailedError('whisper-local', e.message, e)));
          proc.on('exit', (code) => {
            if (code === 0) resolve();
            else reject(new TranscriptionFailedError('whisper-local', `exit ${code}: ${stderr}`));
          });
        });

        const jsonBytes = await readFile(join(tmp, 'out.json'));
        const parsed = JSON.parse(jsonBytes.toString()) as WhisperJsonOutput;

        const lines: TranscriptLine[] = parsed.transcription.map((seg, i) => ({
          id: `whisper-${i}`,
          speaker: seg.speaker_id != null ? `speaker_${seg.speaker_id}` : 'speaker_0',
          startSec: parseTimecode(seg.start),
          endSec: parseTimecode(seg.end),
          text: seg.text.trim(),
        }));

        const speakers = Array.from(new Set(lines.map((l) => l.speaker)));
        const durationSec = lines.length > 0 ? lines[lines.length - 1]!.endSec : 0;

        const transcript: Transcript = {
          version: 1,
          startedAt: startedAt.toISOString(),
          endedAt: new Date().toISOString(),
          lines,
          sttProvider: 'whisper-local',
          language: parsed.result?.language ?? language,
          durationSec,
          speakers,
          meta: { totalAudioBytes: totalBytes, model: this.opts.modelPath },
        };

        emit({ kind: 'closed' });
        return transcript;
      } finally {
        await rm(tmp, { recursive: true, force: true }).catch(() => undefined);
      }
    };

    return {
      write(pcm: Uint8Array) {
        if (closed) return;
        chunks.push(pcm);
        totalBytes += pcm.length;
      },
      on(handler) {
        handlers.add(handler);
        return () => handlers.delete(handler);
      },
      async end() {
        return finalize();
      },
      async abort() {
        closed = true;
        chunks.length = 0;
        emit({ kind: 'closed' });
      },
    } satisfies SttSession;
  }
}

function parseTimecode(t: string): number {
  // whisper.cpp outputs "HH:MM:SS,mmm"
  const [hms, ms] = t.split(',');
  const [h, m, s] = (hms ?? '0:0:0').split(':').map(Number);
  return (h ?? 0) * 3600 + (m ?? 0) * 60 + (s ?? 0) + (Number(ms ?? 0) / 1000);
}

/**
 * Wrap raw 16-bit signed little-endian PCM in a RIFF/WAV container so
 * whisper.cpp can read it. Mono unless `channels` says otherwise.
 */
function pcmToWav(pcm: Buffer, sampleRate: number, channels: number): Buffer {
  const byteRate = sampleRate * channels * 2;
  const blockAlign = channels * 2;
  const dataLen = pcm.length;
  const buf = Buffer.alloc(44 + dataLen);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataLen, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataLen, 40);
  pcm.copy(buf, 44);
  return buf;
}
