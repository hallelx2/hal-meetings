/**
 * Proves the bot's browser runs sandboxed on this host. Run it in the
 * container after a deploy:
 *
 *   docker compose -f apps/agent/docker-compose.yml run --rm hal-agent bun scripts/sandbox-check.ts
 *
 * Launches with the bot's own launch options (src/runtime/browser.ts) and a
 * throwaway profile, so it never touches the signed-in one, then asks
 * Chromium itself via chrome://sandbox. Exits 1 unless the renderer is
 * sandboxed and nothing runs as root.
 */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { chromiumLaunchOptions } from '../src/runtime/browser';

const opts = chromiumLaunchOptions({
  pulseSink: process.env.HAL_PULSE_SINK ?? 'halsink',
  headless: process.env.HAL_HEADLESS === 'true',
  channel: process.env.HAL_BROWSER_CHANNEL,
});

let browser;
try {
  browser = await chromium.launch(opts);
} catch (error) {
  console.error('FAIL: the browser would not start sandboxed:', (error as Error).message.split('\n')[0]);
  console.error('See docs/deploy-aws.md, "Browser sandbox".');
  process.exit(1);
}

const page = await browser.newPage();
await page.goto('chrome://sandbox');
const verdict = (await page.innerText('body')).match(/You are (not )?adequately sandboxed\./)?.[0] ?? 'no verdict';
const renderers = execSync('ps -eo user,args --no-headers')
  .toString()
  .split('\n')
  .filter((line) => line.includes('--type=renderer'));
const report = {
  uid: process.getuid?.(),
  browser: `${opts.channel ?? 'bundled chromium'} ${browser.version()}`,
  verdict,
  rendererUsers: [...new Set(renderers.map((line) => line.trim().split(/\s+/)[0]))],
  unsandboxedRenderers: renderers.filter((line) => line.includes('--no-sandbox')).length,
};
await browser.close();

console.log(JSON.stringify(report, null, 2));
const ok =
  report.uid !== 0 &&
  verdict === 'You are adequately sandboxed.' &&
  report.unsandboxedRenderers === 0 &&
  !report.rendererUsers.includes('root');
console.log(ok ? 'PASS: the browser is sandboxed' : 'FAIL: the browser is not sandboxed');
process.exit(ok ? 0 : 1);
