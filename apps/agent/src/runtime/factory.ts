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
  // Zoom
  ZOOM_SDK_KEY?: string;
  ZOOM_SDK_SECRET?: string;
  ZOOM_SDK_BINARY?: string;
  // Teams
  MS_APP_ID?: string;
  MS_APP_PASSWORD?: string;
  MS_TENANT_ID?: string;
  MS_BOT_CALLBACK_URL?: string;
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
      };
      return new MeetRuntime(meetOpts);
    }

    case 'zoom': {
      if (!env.ZOOM_SDK_KEY || !env.ZOOM_SDK_SECRET || !env.ZOOM_SDK_BINARY) {
        throw new Error(
          '[@hal/agent factory] Zoom runtime requires ZOOM_SDK_KEY, ZOOM_SDK_SECRET, ZOOM_SDK_BINARY',
        );
      }
      const opts: ZoomRuntimeOptions = {
        sdkKey: env.ZOOM_SDK_KEY,
        sdkSecret: env.ZOOM_SDK_SECRET,
        sdkBinaryPath: env.ZOOM_SDK_BINARY,
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
