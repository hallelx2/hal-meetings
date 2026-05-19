import { spawn, type ChildProcess } from 'node:child_process';
import type { AudioCapture, AudioCaptureOpts } from './types';
import type { Logger } from '../logger';

export interface PulseAudioCaptureOptions extends AudioCaptureOpts {
  /** Name of the PulseAudio sink to capture from (Chromium plays into this). */
  sink: string;
  /** Path to parec binary. Defaults to 'parec' in PATH. */
  parecPath?: string;
}

/**
 * PulseAudio capture. Runs `parec --device=<sink>.monitor` as a subprocess
 * and forwards raw PCM frames to subscribers.
 *
 * Use this inside the Docker container where:
 *   - PulseAudio is running
 *   - A null sink named `<sink>` exists
 *   - Chromium is configured (via `--alsa-output-device=<sink>`) to play to that sink
 */
export class PulseAudioCapture implements AudioCapture {
  private proc: ChildProcess | null = null;
  private handlers = new Set<(chunk: Uint8Array) => void>();
  private bytes = 0;

  constructor(
    private readonly opts: PulseAudioCaptureOptions,
    private readonly log: Logger,
  ) {}

  async start(): Promise<void> {
    if (this.proc) return;
    const sampleRate = this.opts.sampleRate ?? 16000;
    const channels = this.opts.channels ?? 1;
    const format = this.opts.format ?? 's16le';
    const parecPath = this.opts.parecPath ?? 'parec';

    const args = [
      `--device=${this.opts.sink}.monitor`,
      `--rate=${sampleRate}`,
      `--channels=${channels}`,
      `--format=${format}`,
      '--raw',
    ];
    this.log.info({ parecPath, args }, 'starting parec');

    this.proc = spawn(parecPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    this.proc.stdout?.on('data', (chunk: Buffer) => {
      this.bytes += chunk.length;
      const view = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
      for (const h of this.handlers) h(view);
    });
    this.proc.stderr?.on('data', (b: Buffer) => {
      this.log.warn({ stderr: b.toString().trim() }, 'parec stderr');
    });
    this.proc.on('error', (e) => this.log.error({ err: e.message }, 'parec error'));
    this.proc.on('exit', (code) => {
      this.log.info({ code }, 'parec exited');
      this.proc = null;
    });
  }

  onPcm(handler: (chunk: Uint8Array) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  async stop(): Promise<void> {
    if (!this.proc) return;
    const proc = this.proc;
    this.proc = null;
    return new Promise<void>((resolve) => {
      proc.once('exit', () => resolve());
      proc.kill('SIGTERM');
      setTimeout(() => {
        if (!proc.killed) proc.kill('SIGKILL');
        resolve();
      }, 2_000);
    });
  }

  bytesCaptured(): number {
    return this.bytes;
  }
}
