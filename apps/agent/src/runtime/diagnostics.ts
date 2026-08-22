import type { Page } from 'playwright';
import type { Logger } from '../logger';

/**
 * What the page looked like when a join failed.
 *
 * Every browser failure in this project so far has been diagnosed the same way:
 * SSH to the box, write a throwaway Playwright script, drive the same URL by
 * hand, and print the buttons. Four times in one evening. Each time the answer
 * was sitting in the DOM at the moment of failure and was thrown away with the
 * browser.
 *
 * The DOM is not going to stop changing — that is the cost of driving a UI
 * nobody promised us. What can change is how long it takes to find out *what*
 * changed. An inventory in the log turns an hour of probing into reading the
 * error, which is the difference between an approach that is brittle and one
 * that is unmaintainable.
 *
 * Nothing here may throw. A capture that fails while reporting a failure would
 * replace the real error with its own, which is worse than no capture at all.
 */

export type ElementFact = {
  kind: 'button' | 'input';
  text: string;
  aria: string;
  placeholder: string;
  visible: boolean;
  enabled: boolean;
};

export type PageSnapshot = {
  url: string;
  title: string;
  elements: ElementFact[];
  bodyText: string;
  screenshotPath: string | null;
};

/** Keep log lines readable and bounded. */
const MAX_ELEMENTS = 25;
const MAX_TEXT = 60;
const MAX_BODY = 400;

export function clip(value: string | null | undefined, max: number): string {
  const flat = (value ?? '').replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}

/**
 * One line per element, in the shape the eye reads fastest when scanning a log.
 *
 * Disabled-but-visible is called out explicitly because that exact state — a
 * join button rendered and greyed out, waiting on an empty name field — was
 * reported for an hour as "could not find a join button".
 */
export function formatElement(fact: ElementFact): string {
  const state = !fact.visible ? 'hidden' : fact.enabled ? 'ok' : 'DISABLED';
  const label = fact.aria || fact.placeholder || fact.text || '(no label)';
  const extra = fact.aria && fact.text && fact.aria !== fact.text ? ` text=${JSON.stringify(fact.text)}` : '';
  return `${fact.kind} [${state}] ${JSON.stringify(label)}${extra}`;
}

async function readElements(page: Page): Promise<ElementFact[]> {
  const facts: ElementFact[] = [];

  for (const [kind, selector] of [
    ['button', 'button'],
    ['input', 'input, textarea, [contenteditable="true"]'],
  ] as const) {
    const nodes = await page
      .locator(selector)
      .all()
      .catch(() => []);

    for (const node of nodes) {
      if (facts.length >= MAX_ELEMENTS) return facts;
      try {
        const [text, aria, placeholder, visible, enabled] = await Promise.all([
          node.textContent().catch(() => ''),
          node.getAttribute('aria-label').catch(() => ''),
          node.getAttribute('placeholder').catch(() => ''),
          node.isVisible().catch(() => false),
          node.isEnabled().catch(() => false),
        ]);
        // Unlabelled invisible nodes are noise; Meet renders hundreds.
        if (!visible && !aria && !placeholder) continue;
        facts.push({
          kind,
          text: clip(text, MAX_TEXT),
          aria: clip(aria, MAX_TEXT),
          placeholder: clip(placeholder, MAX_TEXT),
          visible,
          enabled,
        });
      } catch {
        // A node can detach mid-read. Skip it.
      }
    }
  }

  return facts;
}

/**
 * Capture and log what the page looked like. Never throws.
 *
 * `screenshotDir` is optional because the screenshot is the least useful part
 * over SSH — the element inventory goes into the log itself, where it can be
 * read without file access to the box.
 */
export async function captureFailure(
  page: Page,
  log: Logger,
  tag: string,
  screenshotDir?: string,
): Promise<PageSnapshot | null> {
  try {
    const [url, title] = await Promise.all([
      Promise.resolve(page.url()).catch(() => 'unknown'),
      page.title().catch(() => 'unknown'),
    ]);

    const elements = await readElements(page).catch(() => [] as ElementFact[]);
    const bodyText = clip(
      await page
        .locator('body')
        .textContent()
        .catch(() => ''),
      MAX_BODY,
    );

    let screenshotPath: string | null = null;
    if (screenshotDir) {
      const path = `${screenshotDir.replace(/\/+$/, '')}/${tag}.png`;
      try {
        await page.screenshot({ path });
        screenshotPath = path;
      } catch {
        screenshotPath = null;
      }
    }

    log.error(
      {
        tag,
        url,
        title,
        screenshotPath,
        // Rendered rather than raw: a log reader should not have to parse JSON
        // to see that the join button was present and disabled.
        elements: elements.map(formatElement),
        bodyText,
      },
      'join failed — page inventory at the moment of failure',
    );

    return { url, title, elements, bodyText, screenshotPath };
  } catch (e) {
    log.warn({ err: (e as Error).message, tag }, 'could not capture failure diagnostics');
    return null;
  }
}
