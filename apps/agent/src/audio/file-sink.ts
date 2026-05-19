import { open, type FileHandle } from 'node:fs/promises';
import type { AudioCapture } from './types';

/**
 * Wrap an AudioCapture and tee its PCM stream into a .wav file. Useful for
 * debugging — you can inspect raw audio after the meeting.
 *
 * Writes a 16-bit signed PCM WAV with a fixed header that gets rewritten with
 * the actual data length when `stop()` is called.
 */
export class FileTee {
  private fh: FileHandle | null = null;
  private bytes = 0;
  private unsub: (() => void) | null = null;

  constructor(
    private readonly inner: AudioCapture,
    private readonly filePath: string,
    private readonly sampleRate = 16000,
    private readonly channels = 1,
  ) {}

  async start(): Promise<void> {
    this.fh = await open(this.filePath, 'w');
    // Placeholder header — patched on stop().
    await this.fh.write(Buffer.alloc(44));
    this.unsub = this.inner.onPcm(async (chunk) => {
      if (!this.fh) return;
      this.bytes += chunk.length;
      await this.fh.write(Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength));
    });
  }

  async stop(): Promise<void> {
    if (this.unsub) {
      this.unsub();
      this.unsub = null;
    }
    if (!this.fh) return;
    const header = makeWavHeader(this.bytes, this.sampleRate, this.channels);
    await this.fh.write(header, 0, 44, 0);
    await this.fh.close();
    this.fh = null;
  }
}

function makeWavHeader(dataBytes: number, sampleRate: number, channels: number): Buffer {
  const byteRate = sampleRate * channels * 2;
  const blockAlign = channels * 2;
  const buf = Buffer.alloc(44);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataBytes, 40);
  return buf;
}
