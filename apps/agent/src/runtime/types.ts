import type { Platform } from '@hal/db';
import type { Logger } from '../logger';

export interface JoinOptions {
  meetingUrl: string;
  userId: string;
  userDisplayName: string; // e.g. "Halleluyah Oludele"
  meetingId: string; // hal meetings.id
  mode: 'listen' | 'chat' | 'speak';
  disclosure: string; // pre-rendered (user name substituted)
  botDisplayName: string; // pre-rendered (user name substituted)
}

export type RuntimeEvent =
  | { kind: 'joining' }
  | { kind: 'in-lobby' }
  | { kind: 'joined'; at: Date }
  | { kind: 'disclosed' }
  | { kind: 'audio-started' }
  | { kind: 'chat-message'; from: string; text: string }
  | { kind: 'kicked'; reason: string }
  | { kind: 'kill-requested'; from: string }
  | { kind: 'left'; at: Date }
  | { kind: 'error'; error: Error };

export interface JoinSession {
  /** Subscribe to runtime events. Returns an unsubscribe function. */
  on(handler: (event: RuntimeEvent) => void): () => void;
  /** Post a message into the in-meeting chat (if the runtime supports it). */
  sendChat(text: string): Promise<void>;
  /** Trigger Hal to leave gracefully (e.g. user pressed kill switch). */
  leave(reason: string): Promise<void>;
  /** Force-kill the underlying process — for unrecoverable errors. */
  abort(): Promise<void>;
}

export interface BotRuntime {
  readonly platform: Platform;
  /**
   * Join the meeting. Resolves when the bot is admitted (or rejected) and is
   * either in-call or has surfaced a failure event.
   *
   * The audio path is up to the caller — see audio/ for the PulseAudio sink
   * that captures playback from this Chromium process.
   */
  join(opts: JoinOptions, logger: Logger): Promise<JoinSession>;
}
