import type { Platform } from '@hal/db';
import type { BotRuntime } from './types';
import { MeetRuntime, type MeetRuntimeOptions } from './meet';
import { ZoomRuntime, type ZoomRuntimeOptions } from './zoom';
import { TeamsRuntime, type TeamsRuntimeOptions } from './teams';

export interface RuntimeFactoryEnv {
  // Meet
  HAL_PULSE_SINK?: string;
  HAL_HEADLESS?: string;
  HAL_USER_DATA_DIR?: string;
  HAL_ADMISSION_TIMEOUT_MS?: string;
  // Zoom — the web client needs no Marketplace credentials at all.
  ZOOM_PASSCODE?: string;
  // Teams
  MS_APP_ID?: string;
  MS_APP_PASSWORD?: string;
  MS_TENANT_ID?: string;
  MS_BOT_CALLBACK_URL?: string;
}

/**
 * Ten minutes by default. A host mid-sentence does not look at the admit
 * prompt for a while, and Hal is routinely sent before a meeting starts —
 * treating that as a refusal was the old behaviour and it was wrong.
 */
function admissionTimeout(env: RuntimeFactoryEnv): number {
  const raw = Number(env.HAL_ADMISSION_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 600_000;
}

export function createRuntime(
  platform: Platform,
  env: RuntimeFactoryEnv = process.env as RuntimeFactoryEnv,
): BotRuntime {
  switch (platform) {
    case 'meet': {
      const meetOpts: MeetRuntimeOptions = {
        pulseSink: env.HAL_PULSE_SINK ?? 'halsink',
        headless: env.HAL_HEADLESS !== 'false',
        userDataDir: env.HAL_USER_DATA_DIR,
        admissionTimeoutMs: admissionTimeout(env),
      };
      return new MeetRuntime(meetOpts);
    }

    case 'zoom': {
      // Same browser, same PulseAudio sink as Meet. Zoom's web client needs no
      // SDK key, no secret and no downloaded binary — which is the whole reason
      // this platform could ship without waiting on Marketplace approval.
      const opts: ZoomRuntimeOptions = {
        pulseSink: env.HAL_PULSE_SINK ?? 'halsink',
        headless: env.HAL_HEADLESS !== 'false',
        // Shared with Meet: one signed-in browser profile on the box is the
        // bot's identity on both platforms.
        userDataDir: env.HAL_USER_DATA_DIR,
        admissionTimeoutMs: admissionTimeout(env),
        passcode: env.ZOOM_PASSCODE,
      };
      return new ZoomRuntime(opts);
    }

    case 'teams': {
      if (
        !env.MS_APP_ID ||
        !env.MS_APP_PASSWORD ||
        !env.MS_TENANT_ID ||
        !env.MS_BOT_CALLBACK_URL
      ) {
        throw new Error(
          '[@hal/agent factory] Teams runtime requires MS_APP_ID, MS_APP_PASSWORD, MS_TENANT_ID, MS_BOT_CALLBACK_URL',
        );
      }
      const opts: TeamsRuntimeOptions = {
        microsoftAppId: env.MS_APP_ID,
        microsoftAppPassword: env.MS_APP_PASSWORD,
        tenantId: env.MS_TENANT_ID,
        callbackUrl: env.MS_BOT_CALLBACK_URL,
      };
      return new TeamsRuntime(opts);
    }

    default:
      throw new Error(`[@hal/agent factory] unknown platform: ${platform as string}`);
  }
}
