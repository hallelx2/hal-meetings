import type { BotRuntime, JoinOptions, JoinSession } from './types';
import type { Logger } from '../logger';

export interface ZoomRuntimeOptions {
  /** Zoom SDK key from Marketplace app. */
  sdkKey: string;
  /** Zoom SDK secret. */
  sdkSecret: string;
  /** Path to the Linux SDK binary the worker subprocess will exec. */
  sdkBinaryPath: string;
}

/**
 * Zoom Meeting SDK runtime (placeholder).
 *
 * Implementation plan:
 *   1. Spawn the Zoom Linux SDK subprocess (the C++ binary) with creds + meeting params.
 *   2. The SDK process joins the meeting, gives us a raw PCM audio stream via stdout.
 *   3. The SDK reports admission / kick / chat events via JSON lines on stderr or a side channel.
 *   4. Convert SDK events into RuntimeEvent emissions identical to MeetRuntime.
 *   5. Provide `sendChat` and `leave` by writing commands to the SDK process stdin.
 *
 * Why this is not yet implemented: the Zoom Meeting SDK for Linux is a
 * downloaded C++ binary gated behind a Marketplace developer account. Once
 * the account is set up (Track A1 in docs/m1-bot-runtime.md), this becomes
 * concrete work. The interface matches Meet's so plumbing doesn't change.
 */
export class ZoomRuntime implements BotRuntime {
  readonly platform = 'zoom' as const;

  constructor(private readonly opts: ZoomRuntimeOptions) {
    if (!opts.sdkKey || !opts.sdkSecret || !opts.sdkBinaryPath) {
      throw new Error('[@hal/agent zoom] missing sdkKey/sdkSecret/sdkBinaryPath');
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async join(_opts: JoinOptions, _log: Logger): Promise<JoinSession> {
    throw new Error(
      '[@hal/agent zoom] not yet integrated. Track A1 — register Zoom Marketplace app, then implement SDK subprocess wrapper.',
    );
  }
}
