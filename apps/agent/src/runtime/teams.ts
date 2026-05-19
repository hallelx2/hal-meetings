import type { BotRuntime, JoinOptions, JoinSession } from './types';
import type { Logger } from '../logger';

export interface TeamsRuntimeOptions {
  microsoftAppId: string;
  microsoftAppPassword: string;
  /** Tenant id of the Azure tenant the bot is registered in. */
  tenantId: string;
  /** Public callback URL for Bot Framework events. */
  callbackUrl: string;
}

/**
 * Microsoft Teams Bot Framework runtime (placeholder).
 *
 * Implementation plan:
 *   1. Register an Azure Bot with the Calling and Meeting permission (gated; see docs).
 *   2. This module subscribes to incoming-call events via Bot Framework webhooks.
 *   3. On incoming meeting invite, accept the call via the Communications API,
 *      and tap the audio stream via Calls.AccessMedia.All permission.
 *   4. Expose RuntimeEvents identical to MeetRuntime.
 *
 * Why this is not yet implemented: the Calling/Meeting permission is a
 * non-self-serve Microsoft Partner Center request (Track A3 in
 * docs/m1-bot-runtime.md), 4-12 weeks of external review. Until that lands,
 * the Bot Framework SDK won't grant us audio access — so the code below the
 * `join()` is moot. Interface is finalized; once approval comes through this
 * becomes the implementable work item.
 */
export class TeamsRuntime implements BotRuntime {
  readonly platform = 'teams' as const;

  constructor(private readonly opts: TeamsRuntimeOptions) {
    const required = ['microsoftAppId', 'microsoftAppPassword', 'tenantId', 'callbackUrl'] as const;
    for (const k of required) {
      if (!opts[k]) throw new Error(`[@hal/agent teams] missing ${k}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async join(_opts: JoinOptions, _log: Logger): Promise<JoinSession> {
    throw new Error(
      '[@hal/agent teams] not yet integrated. Track A3 — Microsoft Calling/Meeting permission request pending, no audio access until approved.',
    );
  }
}
