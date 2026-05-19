export interface AudioCaptureOpts {
  sampleRate?: number; // default 16000
  channels?: number; // default 1
  format?: 's16le' | 'f32le'; // default 's16le'
}

export interface AudioCapture {
  /** Begin capture. Resolves once subprocess (or sink) is producing data. */
  start(): Promise<void>;
  /** Subscribe to PCM chunks. */
  onPcm(handler: (chunk: Uint8Array) => void): () => void;
  /** Stop capturing. Idempotent. */
  stop(): Promise<void>;
  /** Bytes captured so far. */
  bytesCaptured(): number;
}
