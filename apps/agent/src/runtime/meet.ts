import { chromium, type Browser, type Page, type BrowserContext } from 'playwright';
import type { BotRuntime, JoinOptions, JoinSession, RuntimeEvent } from './types';
import type { Logger } from '../logger';
import { captureFailure } from './diagnostics';
import { findKillCommand, isOwnDisclosure, newText } from './chat-commands';

/**
 * The hang-up button — present for exactly as long as we are in the call, and
 * nothing else is. Used both to confirm admission and to notice the end, so the
 * two can never disagree about whether Hal is in a meeting.
 */
const IN_CALL_SELECTOR =
  'button[aria-label*="Leave call" i], button[aria-label*="End call" i], button[aria-label*="Hang up" i]';

/**
 * The chat *panel*, not the message nodes inside it.
 *
 * Enumerating messages meant guessing Google's internal class names, and that
 * guess matched nothing for an entire meeting — silently — while the
 * disclosure promised participants they could remove Hal. Reading the panel's
 * whole text and diffing it needs only one assumption: that a chat message
 * eventually becomes visible text inside the chat panel.
 */
const CHAT_PANEL_SELECTOR = [
  'div[aria-label*="chat" i][role="region"]',
  'div[role="complementary"]',
  'aside',
  '[aria-live="polite"]',
].join(', ');

/**
 * Chat is off, so Hal cannot announce itself — and therefore must not record.
 *
 * The disclosure is the entire basis on which recording other people is
 * acceptable. Without it there is no honest way to stay in the room, so this
 * ends the join rather than quietly degrading to an undisclosed recording.
 */
export class ChatUnavailableError extends Error {
  constructor() {
    super(
      "[@hal/agent meet] chat is turned off in this meeting, so Hal cannot announce itself and will not record. Turn on chat for participants, then send Hal again.",
    );
    this.name = 'ChatUnavailableError';
  }
}

/** Meet's relabelled textarea when the host has disabled chat. */
const CHAT_DISABLED_SELECTOR = 'textarea[aria-label*="Chat isn" i][aria-label*="available" i]';

/** The chat composer, across the shapes Meet has shipped. */
const CHAT_INPUT_SELECTOR = [
  'textarea[aria-label*="Send a message" i]',
  'textarea[placeholder*="Send a message" i]',
  'textarea[aria-label*="message" i]:not([aria-label*="available" i])',
  'div[contenteditable="true"][aria-label*="message" i]',
].join(', ');

export interface MeetRuntimeOptions {
  /** PulseAudio sink to route Chromium audio to (must exist in the container). */
  pulseSink: string;
  /** Headless mode. Default true. False is useful for debugging. */
  headless?: boolean;
  /** Optional path to a persistent profile dir (lets you reuse a signed-in account). */
  userDataDir?: string;
  /** Slow-mo for debug (milliseconds between actions). 0 in prod. */
  slowMoMs?: number;
  /** How long to wait for admission before giving up. Default 90s. */
  admissionTimeoutMs?: number;
  /** Where to drop a screenshot when a join fails. Optional — the element
   *  inventory goes to the log either way, which is what gets read over SSH. */
  diagnosticsDir?: string;
}

/**
 * Google Meet runtime using Playwright headless Chromium.
 *
 * The flow is:
 *   1. Launch Chromium with fake media flags (so getUserMedia doesn't prompt).
 *   2. Navigate to the meeting URL.
 *   3. If it's the guest-name screen, set "Hal · AI for <user>".
 *   4. Click "Ask to join" (or "Join now" if already signed in).
 *   5. Wait for either the in-call UI to appear OR a rejection state.
 *   6. Once in call: open chat, post the disclosure, start watching for /hal stop.
 *
 * IMPORTANT: Meet's DOM is not a public API. The selectors below are
 * accessible-name-based where possible; they will need maintenance over time.
 *
 * Audio capture is NOT done in this module — it's done by spawning a `parec`
 * subprocess (see audio/pulse.ts) reading from the PulseAudio sink monitor.
 */
export class MeetRuntime implements BotRuntime {
  readonly platform = 'meet' as const;

  constructor(private readonly opts: MeetRuntimeOptions) {}

  async join(joinOpts: JoinOptions, log: Logger): Promise<JoinSession> {
    const handlers = new Set<(e: RuntimeEvent) => void>();
    const emit = (e: RuntimeEvent) => {
      log.debug({ event: e.kind }, 'meet runtime event');
      for (const h of handlers) h(e);
    };
    emit({ kind: 'joining' });

    // One arg list for both launch paths. They diverged once — the persistent
    // branch quietly dropped --disable-blink-features=AutomationControlled —
    // and a signed-in Chromium advertising itself as automated is exactly the
    // client Google stalls, which surfaced as goto() timing out on a page that
    // loads fine by hand.
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--use-fake-ui-for-media-stream', // auto-accept mic/cam prompts
      '--autoplay-policy=no-user-gesture-required',
      // Pin audio output to the PulseAudio sink we'll capture from.
      `--alsa-output-device=${this.opts.pulseSink}`,
    ];
    const userAgent =
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

    let browser: Browser | null = null;
    let context: BrowserContext;

    if (this.opts.userDataDir) {
      // Straight to the persistent context. The old code launched a throwaway
      // browser first and immediately closed it, which bought nothing and cost
      // a browser start on every join.
      context = await chromium.launchPersistentContext(this.opts.userDataDir, {
        headless: this.opts.headless ?? true,
        slowMo: this.opts.slowMoMs ?? 0,
        args,
        permissions: ['microphone', 'camera'],
        userAgent,
        viewport: { width: 1280, height: 800 },
      });
      log.info({ userDataDir: this.opts.userDataDir }, 'using persistent Meet profile');
    } else {
      browser = await chromium.launch({
        headless: this.opts.headless ?? true,
        slowMo: this.opts.slowMoMs ?? 0,
        args,
      });
      context = await browser.newContext({
        permissions: ['microphone', 'camera'],
        userAgent,
        viewport: { width: 1280, height: 800 },
      });
    }

    // Before any page exists. An init script only applies to pages created
    // after it is registered, so the old ordering — newPage() then
    // addInitScript() — left navigator.webdriver exposed on the one page the
    // runtime actually used.
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    // A persistent context opens with a page already; making another leaves a
    // stray about:blank behind for the life of the meeting.
    const page = context.pages()[0] ?? (await context.newPage());

    /**
     * Every failure from here on reports what the page looked like when it
     * happened, then closes the browser. Both halves matter: the inventory is
     * how a DOM change gets diagnosed from a log instead of a hand-written
     * probe, and the cleanup is what stops one failure orphaning Chromium on
     * the profile lock.
     */
    const failed = async (e: unknown): Promise<never> => {
      await captureFailure(page, log, 'meet-join', this.opts.diagnosticsDir);
      await this.cleanup(context, page);
      throw e;
    };

    try {
      log.info({ meetingUrl: joinOpts.meetingUrl }, 'navigating to Meet URL');
    // `domcontentloaded`, not `load`: Meet is a long-polling SPA whose load
    // event can lag far behind the page being usable, and waiting for it made
    // a working join look like a dead one.
      await page.goto(joinOpts.meetingUrl, { waitUntil: 'domcontentloaded', timeout: 90_000 });
      await page.waitForTimeout(3_000);

    // Step 0: clear the tooltips Meet stacks over the pre-join screen. The
    // "Sign in with your Google account" bubble is the usual one, and while it
    // does not always cover the join button it does take focus.
      await this.dismissTooltips(page, log);

    // Step 1: name entry (guest mode). May be skipped if signed in.
      await this.maybeEnterName(page, joinOpts.botDisplayName, log);

    // Step 2: turn off the camera (we don't have one) and mic (we'll unmute later
    // if/when in speak mode). These are the labeled buttons before joining.
      await this.muteBeforeJoining(page, log);

    // Step 3: click "Ask to join" or "Join now".
      await this.clickJoin(page, log);

    // Step 4: wait for admission. Either we're in-call (chat icon visible),
    // or we got bounced from the lobby.
      const admitted = await this.waitForAdmission(
        page,
        this.opts.admissionTimeoutMs ?? 90_000,
        log,
      );

      if (!admitted) {
        emit({ kind: 'kicked', reason: 'not admitted within timeout' });
        throw new Error('[@hal/agent meet] not admitted to meeting');
      }
    } catch (e) {
      return failed(e);
    }

    emit({ kind: 'joined', at: new Date() });

    // Step 5: open chat and post disclosure.
    //
    // Anything that throws from here must still close the browser. It did not,
    // and one failed disclosure left Chromium alive holding the profile lock —
    // so every later job died on "profile is already in use" until the orphan
    // was killed by hand. A single failure poisoned the whole host.
    try {
      await this.postDisclosure(page, joinOpts.disclosure, log);
    } catch (e) {
      return failed(e);
    }
    emit({ kind: 'disclosed' });

    // Step 6: subscribe to chat for /hal stop and listen for "you've been removed" UI.
    const stopWatching = this.watchCall(page, emit, log, joinOpts.disclosure);

    let left = false;
    const leave = async (reason: string) => {
      if (left) return;
      left = true;
      stopWatching();
      try {
        await this.leaveCall(page);
      } catch (e) {
        log.warn({ err: (e as Error).message }, 'leave call failed');
      }
      emit({ kind: 'left', at: new Date() });
      await this.cleanup(context, page);
    };

    const self = this;
    return {
      on(handler) {
        handlers.add(handler);
        return () => handlers.delete(handler);
      },
      async sendChat(text: string) {
        await self.sendChat(page, text);
      },
      leave,
      async abort() {
        stopWatching();
        await self.cleanup(context, page);
      },
    } satisfies JoinSession;
  }

  // ---- internal step implementations ----

  /**
   * Meet stacks coach-marks over the pre-join screen. They do not always cover
   * anything, but they do hold focus, and a dismissed tooltip is one less thing
   * between the name field and the keyboard.
   */
  private async dismissTooltips(page: Page, log: Logger): Promise<void> {
    for (const sel of ['button:has-text("Got it")', 'button:has-text("Dismiss")']) {
      try {
        const btn = page.locator(sel).first();
        await btn.waitFor({ state: 'visible', timeout: 3_000 });
        await btn.click({ timeout: 3_000 });
        log.debug({ sel }, 'dismissed pre-join tooltip');
      } catch {
        // Not present is the common case.
      }
    }
  }

  /**
   * Type the guest name, and check it stuck.
   *
   * This is the step whose silent failure looks like something else entirely.
   * Meet **disables** "Ask to join" until the name field is non-empty, and a
   * disabled button is still a *visible* button — so a lost name surfaces much
   * later as a click that times out, and the join step reports it as "could not
   * find a join button". The field was the problem the whole time.
   *
   * `fill` alone is not enough: the pre-join screen re-renders as it hydrates
   * and has been observed to clear a value written a moment too early. So the
   * value is read back, and retried by typing key-by-key, which survives
   * re-renders that a single programmatic set does not.
   */
  private async maybeEnterName(page: Page, displayName: string, log: Logger): Promise<void> {
    const nameInput = page
      .locator('input[aria-label*="name" i], input[placeholder*="name" i]')
      .first();

    try {
      await nameInput.waitFor({ state: 'visible', timeout: 15_000 });
    } catch {
      log.debug('no name input visible — assuming signed-in or already named');
      return;
    }

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await nameInput.click({ timeout: 5_000 });
        await nameInput.fill('');
        await nameInput.fill(displayName);

        const value = await nameInput.inputValue();
        if (value.trim()) {
          log.info({ displayName: value, attempt }, 'set guest display name');
          return;
        }

        // A re-render ate it. Typing survives what setting the value does not.
        await nameInput.pressSequentially(displayName, { delay: 25 });
        if ((await nameInput.inputValue()).trim()) {
          log.info({ displayName, attempt }, 'set guest display name by typing');
          return;
        }
      } catch (e) {
        log.debug({ err: (e as Error).message, attempt }, 'name entry attempt failed');
      }
      await page.waitForTimeout(1_000);
    }

    // Loud, because everything after this fails in a way that points elsewhere.
    log.error('could not set the guest name — Meet will keep the join button disabled');
  }

  private async muteBeforeJoining(page: Page, log: Logger): Promise<void> {
    // Pre-join camera + mic toggles. Their labels rotate; both English variants:
    const buttons = [
      'button[aria-label*="Turn off camera" i]',
      'button[aria-label*="Turn off microphone" i]',
    ];
    for (const sel of buttons) {
      try {
        const el = page.locator(sel).first();
        await el.waitFor({ state: 'visible', timeout: 3_000 });
        await el.click({ timeout: 3_000 });
      } catch {
        log.debug({ sel }, 'pre-join toggle not found (already muted/off)');
      }
    }
  }

  /**
   * Click the join button, and say which of the two failures happened.
   *
   * "Not on the page" and "on the page but disabled" need completely different
   * fixes — a selector change versus a missing guest name — and the old code
   * reported both as "could not find a join button", which sent the search to
   * the wrong place.
   */
  private async clickJoin(page: Page, log: Logger): Promise<void> {
    const candidates = [
      'button:has-text("Ask to join")',
      'button:has-text("Join now")',
      'button[aria-label*="Join now" i]',
      'button[aria-label*="Ask to join" i]',
    ];

    let seenButDisabled = false;

    for (const sel of candidates) {
      const btn = page.locator(sel).first();
      try {
        await btn.waitFor({ state: 'visible', timeout: 6_000 });
      } catch {
        continue; // genuinely not on the page
      }

      // Meet keeps the button mounted and disabled until the form is valid, so
      // wait for it to become enabled rather than clicking into a dead target.
      try {
        await page
          .locator(`${sel}:not([disabled]):not([aria-disabled="true"])`)
          .first()
          .waitFor({ state: 'visible', timeout: 15_000 });
      } catch {
        seenButDisabled = true;
        log.warn({ sel }, 'join button present but still disabled');
        continue;
      }

      try {
        await btn.click({ timeout: 8_000 });
        log.info({ sel }, 'clicked join');
        return;
      } catch (e) {
        log.warn({ sel, err: (e as Error).message }, 'join button click failed');
      }
    }

    throw new Error(
      seenButDisabled
        ? '[@hal/agent meet] join button stayed disabled — the guest name was not accepted'
        : '[@hal/agent meet] could not find a join button',
    );
  }

  private async waitForAdmission(page: Page, timeoutMs: number, log: Logger): Promise<boolean> {
    // Heuristic: in-call UI shows the leave-call (hang up) button. The
    // accessible name is "Leave call" or "End call" depending on host.
    try {
      await page.locator(IN_CALL_SELECTOR).first().waitFor({ state: 'visible', timeout: timeoutMs });
      log.info('admitted to call');
      return true;
    } catch {
      log.warn('admission timed out');
      return false;
    }
  }

  private async openChat(page: Page): Promise<void> {
    const chatToggle = page
      .locator(
        'button[aria-label*="Chat with everyone" i], button[aria-label*="Chat" i]:not([aria-label*="off" i])',
      )
      .first();
    await chatToggle.click({ timeout: 5_000 });
  }

  private async postDisclosure(page: Page, disclosure: string, log: Logger): Promise<void> {
    try {
      await this.openChat(page);
      await this.sendChat(page, disclosure);
      log.info('disclosure posted to chat');
    } catch (e) {
      log.warn({ err: (e as Error).message }, 'failed to post disclosure');
      throw e;
    }
  }

  /**
   * Post into the meeting chat.
   *
   * Meet keeps the textarea mounted when chat is turned off and simply relabels
   * it "Chat isn't available". The old selector keyed on "Send a message", so a
   * deliberately-disabled chat surfaced as a five-second timeout that read
   * exactly like a stale selector. The two are checked separately because they
   * need opposite responses: one is our bug, the other is the host's setting.
   */
  private async sendChat(page: Page, text: string): Promise<void> {
    const unavailable = page.locator(CHAT_DISABLED_SELECTOR).first();
    if (await unavailable.isVisible({ timeout: 1_500 }).catch(() => false)) {
      throw new ChatUnavailableError();
    }

    const input = page.locator(CHAT_INPUT_SELECTOR).first();

    try {
      await input.waitFor({ state: 'visible', timeout: 5_000 });
    } catch {
      // Chat may have been switched off between the two probes.
      if (await unavailable.isVisible({ timeout: 500 }).catch(() => false)) {
        throw new ChatUnavailableError();
      }
      throw new Error('[@hal/agent meet] could not find the chat input');
    }

    await input.fill(text);
    await input.press('Enter');
  }

  /**
   * Watch the call: chat for `/hal stop`, and the in-call UI for the call ending.
   *
   * The end signal is **structural, not textual**. The previous version matched
   * on "removed from the meeting" / "you left the meeting", neither of which is
   * what Meet shows when a host ends a call — so Hal sat in a finished meeting
   * for thirteen minutes with nine transcript lines it never got to write, and
   * would have sat there indefinitely.
   *
   * Instead: the hang-up button is the one thing that is present for exactly as
   * long as we are in the call. Its sustained absence means we are out, whatever
   * words Google chose, in whatever language.
   */
  private watchCall(
    page: Page,
    emit: (e: RuntimeEvent) => void,
    log: Logger,
    disclosure: string,
  ): () => void {
    const seen = new Set<string>();
    let lastPanelText = '';
    // One missed poll is a re-render. Three in a row is the call being over.
    let missingInCallUi = 0;
    let chatNodesEverSeen = false;
    let polls = 0;
    let done = false;

    const finish = (reason: string) => {
      if (done) return;
      done = true;
      emit({ kind: 'kicked', reason });
    };

    const interval = setInterval(() => {
      void (async () => {
        if (done) return;
        polls += 1;
        try {
          const panelText = (
            await page
              .locator(CHAT_PANEL_SELECTOR)
              .first()
              .textContent()
              .catch(() => '')
          )?.trim() ?? '';

          if (panelText) {
            chatNodesEverSeen = true;
            const fresh = newText(lastPanelText, panelText);
            lastPanelText = panelText;

            // Hal's own disclosure contains the literal "/hal stop". Without
            // this it reads its own announcement and leaves the meeting a
            // moment after joining it.
            if (fresh && !isOwnDisclosure(fresh, disclosure)) {
              const command = findKillCommand(fresh);
              if (command && !seen.has(command + fresh.length)) {
                seen.add(command + fresh.length);
                log.info({ command }, 'kill requested in chat');
                emit({ kind: 'chat-message', from: 'participant', text: fresh.slice(0, 200) });
                emit({ kind: 'kill-requested', from: 'participant' });
              }
            }
          }

          // Silent breakage and a quiet meeting look identical from here, so
          // say which one this is rather than letting a broken kill switch
          // pass for calm.
          if (!chatNodesEverSeen && polls === 24) {
            log.warn(
              'chat panel has produced no text in 60s — /hal stop may not be detectable; the panel selector is likely stale',
            );
          }

          const inCall = await page
            .locator(IN_CALL_SELECTOR)
            .first()
            .isVisible()
            .catch(() => false);

          if (inCall) {
            missingInCallUi = 0;
          } else {
            missingInCallUi += 1;
            if (missingInCallUi >= 3) {
              log.info('in-call UI gone for three polls — treating the call as ended');
              finish('call ended');
            }
          }
        } catch (e) {
          log.debug({ err: (e as Error).message }, 'call poll error (will retry)');
        }
      })();
    }, 2_500);

    return () => clearInterval(interval);
  }

  private async leaveCall(page: Page): Promise<void> {
    const leaveBtn = page.locator(IN_CALL_SELECTOR).first();
    await leaveBtn.click({ timeout: 5_000 });
  }

  private async cleanup(context: BrowserContext, page: Page): Promise<void> {
    try {
      await page.close({ runBeforeUnload: false });
    } catch {
      // ignore
    }
    try {
      await context.close();
    } catch {
      // ignore
    }
    const browser = context.browser();
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore
      }
    }
  }
}
