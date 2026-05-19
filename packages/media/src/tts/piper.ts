import { spawn } from 'node:child_process';
import type { TtsProvider, TtsSynthesizeOpts, TtsResult } from './types';
import { ProviderNotConfiguredError } from '../errors';

export interface PiperOptions {
  /** Path to piper binary. */
  binaryPath: string;
  /** Path to the onnx voice model. */
  modelPath: string;
}

/**
 * Local Piper TTS. Subprocess: feed text to stdin, get raw PCM s16le on stdout.
 * Use for air-gapped voice mode (Phase 3).
 */
export class PiperTts implements TtsProvider {
  readonly name = 'piper';

  constructor(private readonly opts: PiperOptions) {
    if (!opts.binaryPath || !opts.modelPath) {
      throw new ProviderNotConfiguredError('piper', 'binaryPath + modelPath');
    }
  }

  async synthesize(opts: TtsSynthesizeOpts): Promise<TtsResult> {
    const proc = spawn(
      this.opts.binaryPath,
      ['--model', this.opts.modelPath, '--output-raw'],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );
    const chunks: Buffer[] = [];
    let stderr = '';

    proc.stdout?.on('data', (b: Buffer) => chunks.push(b));
    proc.stderr?.on('data', (b: Buffer) => (stderr += b.toString()));
    proc.stdin?.write(opts.text);
    proc.stdin?.end();

    return new Promise<TtsResult>((resolve, reject) => {
      proc.on('error', (e) => reject(e));
      proc.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`[@hal/media] piper exited ${code}: ${stderr}`));
          return;
        }
        const audio = Buffer.concat(chunks);
        resolve({
          audio: new Uint8Array(audio.buffer, audio.byteOffset, audio.byteLength),
          format: 'pcm-s16le',
          sampleRate: opts.sampleRate ?? 22050,
        });
      });
    });
  }
}
