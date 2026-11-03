import type { LaunchOptions } from 'playwright';

export interface BrowserLaunchConfig {
  /** PulseAudio sink to route Chromium audio to (must exist in the container). */
  pulseSink: string;
  headless?: boolean;
  slowMoMs?: number;
  /**
   * Playwright browser channel. `chrome` is Google Chrome stable, which the
   * image installs on amd64 and which takes Chrome's security fixes on every
   * rebuild; unset is Playwright's bundled Chromium (arm64 has no Chrome).
   */
  channel?: string;
}

/**
 * The one launch config every browser runtime uses, Meet and Zoom alike.
 *
 * The bot spends its life on third-party pages (Meet, Zoom, whatever a
 * meeting link redirects to) inside a profile signed in to a real account, so
 * the Chromium sandbox stays on. Playwright turns it off unless asked
 * (`chromiumSandbox` defaults to false), and the old arg list turned it off
 * twice more with `--no-sandbox` / `--disable-setuid-sandbox`. Without it, a
 * renderer exploit on any of those pages runs as the container user with the
 * Google session and every API key in the env. The image runs as an
 * unprivileged user under docker/seccomp_profile.json (Docker's default plus
 * user namespaces) so the sandbox can start; see docker-compose.yml for why
 * Playwright's own profile is not used.
 *
 * One list for both launch paths: they diverged once, the persistent branch
 * quietly dropping --disable-blink-features=AutomationControlled, and a
 * signed-in Chromium advertising itself as automated is exactly the client
 * Google stalls.
 */
export function chromiumLaunchOptions(cfg: BrowserLaunchConfig): LaunchOptions {
  return {
    channel: cfg.channel || undefined,
    chromiumSandbox: true,
    headless: cfg.headless ?? true,
    slowMo: cfg.slowMoMs ?? 0,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--use-fake-ui-for-media-stream', // auto-accept mic/cam prompts
      '--autoplay-policy=no-user-gesture-required',
      // Pin audio output to the PulseAudio sink we capture from.
      `--alsa-output-device=${cfg.pulseSink}`,
    ],
  };
}
