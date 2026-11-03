import { describe, expect, test } from 'bun:test';
import { chromiumLaunchOptions } from '../src/runtime/browser';
import { createRuntime } from '../src/runtime/factory';

describe('chromiumLaunchOptions', () => {
  const opts = chromiumLaunchOptions({ pulseSink: 'halsink' });

  test('keeps the Chromium sandbox on', () => {
    expect(opts.chromiumSandbox).toBe(true);
  });

  test('passes no flag that disables a sandbox', () => {
    for (const arg of opts.args ?? []) {
      expect(arg).not.toMatch(/sandbox/i);
    }
  });

  test('routes audio to the configured sink and hides automation', () => {
    expect(opts.args).toContain('--alsa-output-device=halsink');
    expect(opts.args).toContain('--disable-blink-features=AutomationControlled');
  });

  test('uses the bundled Chromium unless a channel is set', () => {
    expect(opts.channel).toBeUndefined();
    expect(chromiumLaunchOptions({ pulseSink: 's', channel: '' }).channel).toBeUndefined();
    expect(chromiumLaunchOptions({ pulseSink: 's', channel: 'chrome' }).channel).toBe('chrome');
  });

  test('defaults to headless with no slow-mo', () => {
    expect(opts.headless).toBe(true);
    expect(opts.slowMo).toBe(0);
  });
});

describe('createRuntime', () => {
  test('hands HAL_BROWSER_CHANNEL to the Meet and Zoom runtimes', () => {
    for (const platform of ['meet', 'zoom'] as const) {
      const runtime = createRuntime(platform, { HAL_BROWSER_CHANNEL: 'chrome' }) as unknown as {
        opts: { channel?: string };
      };
      expect(runtime.opts.channel).toBe('chrome');
    }
  });
});
