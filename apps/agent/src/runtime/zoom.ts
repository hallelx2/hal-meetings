import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { parseZoomUrl } from '@hal/meeting-links';
import type { BotRuntime, JoinOptions, JoinSession, RuntimeEvent } from './types';
import type { Logger } from '../logger';

export interface ZoomRuntimeOptions {
  /** PulseAudio sink to route Chromium audio to (must exist in the container). */
  pulseSink: string;
  /** Headless mode. Default true. False is useful for debugging. */
  headless?: boolean;
  /** Slow-mo for debug (milliseconds between actions). 0 in prod. */
  slowMoMs?: number;
  /**
   * Persistent Chromium profile directory.
   *
   * This is how Hal joins meetings restricted to signed-in Zoom users: sign the
   * profile in once, by hand, and every later join reuses that session. There
   * is no OAuth path that grants a bot the right to join a meeting — Zoom's
   * OAuth scopes cover the REST API, not attendance — so a signed-in browser
   * profile is the mechanism, not a workaround for one.
   */
  userDataDir?: string;
  /** How long to wait for admission before giving up. Default 120s. */
  admissionTimeoutMs?: number;
  /**
   * Passcode to type if the web client asks for one and the link carried no
   * `pwd` token. Most invitation links embed it; a manually-typed meeting ID
   * does not.
   */
  passcode?: string;
}

/**
 * Zoom via the **web client**, driven by Playwright.
 *
 * The previous implementation of this file was a placeholder waiting on the
 * Zoom Meeting SDK for Linux — a C++ binary behind a Marketplace developer
 * account. That gate is why Zoom sat unimplemented for months.
 *
 * The web client goes around it entirely. Zoom serves a full browser client at
 * `/wc/join/<id>`, and it needs no Marketplace app, no SDK key and no binary —
 * only a browser, which the Meet runtime already proved this box can drive.
 *
 * What that costs, stated plainly:
 *   - The DOM is not a public API. Selectors here are defensive and will need
 *     maintenance; Zoom ships UI changes without notice.
 *   - A host can disable "join from browser" for their account, and some
 *     meetings require a signed-in Zoom account. Both fail at the join step
 *     rather than silently, and both are surfaced as the failure reason.
 *   - The SDK path remains the better long-term answer for reliability, and
 *     this interface is identical, so swapping back is a factory change.
 *
 * Audio capture is not done here — `parec` reads the PulseAudio sink monitor,
 * exactly as it does for Meet.
 */
export class ZoomRuntime implements BotRuntime {
  readonly platform = 'zoom' as const;

  constructor(private readonly opts: ZoomRuntimeOptions) {}

  async join(joinOpts: JoinOptions, log: Logger): Promise<JoinSession> {
    const handlers = new Set<(e: RuntimeEvent) => void>();
    const emit = (e: RuntimeEvent) => {
      log.debug({ event: e.kind }, 'zoom runtime event');
      for (const h of handlers) h(e);
    };
    emit({ kind: 'joining' });

    const link = parseZoomUrl(joinOpts.meetingUrl);
    if (!link) {
      throw new Error(`[@hal/agent zoom] not a Zoom meeting link: ${joinOpts.meetingUrl}`);
    }

    const launchArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--use-fake-ui-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
      `--alsa-output-device=${this.opts.pulseSink}`,
    ];
    const userAgent =
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

    let browser: Browser | null = null;
    let context: BrowserContext;

    if (this.opts.userDataDir) {
      // A persistent context *is* the browser — there is no separate instance
      // to close, which is why cleanup has to tolerate `browser()` being null.
      context = await chromium.launchPersistentContext(this.opts.userDataDir, {
        headless: this.opts.headless ?? true,
        slowMo: this.opts.slowMoMs ?? 0,
        args: launchArgs,
        permissions: ['microphone', 'camera'],
        userAgent,
        viewport: { width: 1280, height: 800 },
      });
      log.info({ userDataDir: this.opts.userDataDir }, 'using persistent Zoom profile');
    } else {
      browser = await chromium.launch({
        headless: this.opts.headless ?? true,
        slowMo: this.opts.slowMoMs ?? 0,
        args: launchArgs,
      });
      context = await browser.newContext({
        permissions: ['microphone', 'camera'],
        userAgent,
        viewport: { width: 1280, height: 800 },
      });
    }

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const page = await context.newPage();

    log.info(
      { meetingId: link.meetingId, host: link.host, hasPwd: Boolean(link.pwd) },
      'navigating to Zoom web client',
    );
    await page.goto(link.webClientUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });

    // Zoom sometimes still bounces through a consent/cookie interstitial before
    // rendering the join form.
    await this.dismissCookieBanner(page, log);

    await this.fillJoinForm(page, joinOpts.botDisplayName, link.pwd, log);
    await this.clickJoin(page, log);

    const admitted = await this.waitForAdmission(
      page,
      this.opts.admissionTimeoutMs ?? 120_000,
      log,
    );

    if (!admitted) {
      const reason = await this.readBlockingMessage(page);
      emit({ kind: 'kicked', reason });
      await this.cleanup(context, page);
      throw new Error(`[@hal/agent zoom] ${reason}`);
    }

    emit({ kind: 'joined', at: new Date() });

    // Same guarantee as Meet: a throw from here still closes the browser.
    // Without it a failed disclosure orphans Chromium holding the profile lock,
    // and every subsequent job dies on "profile is already in use".
    try {
      await this.postDisclosure(page, joinOpts.disclosure, log);
    } catch (e) {
      await this.cleanup(context, page);
      throw e;
    }
    emit({ kind: 'disclosed' });

    const stopWatching = this.watchChatAndStatus(page, emit, log);

    let left = false;
    const leave = async (reason: string) => {
      if (left) return;
      left = true;
      log.info({ reason }, 'leaving zoom call');
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

  private async dismissCookieBanner(page: Page, log: Logger): Promise<void> {
    // Privacy-preserving choice: reject what can be rejected rather than
    // accepting everything to make a dialog go away.
    const candidates = [
      'button#onetrust-reject-all-handler',
      'button:has-text("Reject All")',
      'button:has-text("Decline")',
      '#onetrust-accept-btn-handler',
    ];
    for (const sel of candidates) {
      try {
        const btn = page.locator(sel).first();
        await btn.waitFor({ state: 'visible', timeout: 2_500 });
        await btn.click({ timeout: 2_500 });
        log.debug({ sel }, 'dismissed cookie banner');
        return;
      } catch {
        // next
      }
    }
  }

  /**
   * The web client's pre-join form: a display name, and a passcode when the
   * link did not carry one.
   *
   * Zoom renders this inside an iframe on some paths and inline on others, so
   * every locator is resolved through a helper that looks in the page and in
   * each frame.
   */
  private async fillJoinForm(
    page: Page,
    displayName: string,
    pwd: string | null,
    log: Logger,
  ): Promise<void> {
    const nameInput = await this.findAcross(page, [
      '#input-for-name',
      'input[aria-label*="name" i]',
      'input[placeholder*="Your Name" i]',
      'input[placeholder*="name" i]',
    ]);

    if (nameInput) {
      await nameInput.fill(displayName);
      log.info({ displayName }, 'set zoom display name');
    } else {
      log.warn('no zoom name input found — the page may not be the web client');
    }

    // Only needed when the URL carried no pwd token.
    if (!pwd && this.opts.passcode) {
      const pwdInput = await this.findAcross(page, [
        '#input-for-pwd',
        'input[type="password"]',
        'input[aria-label*="passcode" i]',
        'input[placeholder*="passcode" i]',
      ]);
      if (pwdInput) {
        await pwdInput.fill(this.opts.passcode);
        log.info('entered zoom passcode');
      } else {
        log.warn('passcode configured but no passcode field found');
      }
    }
  }

  private async clickJoin(page: Page, log: Logger): Promise<void> {
    const join = await this.findAcross(page, [
      'button.preview-join-button',
      'button#joinBtn',
      'button:has-text("Join")',
      'button:has-text("Join Audio by Computer")',
      'a:has-text("Join from Your Browser")',
    ]);
    if (!join) {
      throw new Error('[@hal/agent zoom] could not find a join button on the web client');
    }
    await join.click({ timeout: 8_000 });
    log.info('clicked zoom join');
  }

  private async waitForAdmission(page: Page, timeoutMs: number, log: Logger): Promise<boolean> {
    // In-call is signalled by the footer leave button appearing. The waiting
    // room shows a "Please wait, the meeting host will let you in soon" panel,
    // which is a *successful* intermediate state, not a failure — so the wait
    // runs to the full timeout rather than bailing when it sees it.
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const inCall = await this.findAcross(page, [
        'button[aria-label*="Leave" i]',
        '.footer__leave-btn',
        'button:has-text("Leave")',
      ]);
      if (inCall) {
        log.info('admitted to zoom call');
        return true;
      }

      const blocked = await this.readBlockingMessage(page);
      if (blocked.includes('denied') || blocked.includes('removed') || blocked.includes('ended')) {
        log.warn({ blocked }, 'zoom join blocked');
        return false;
      }

      await page.waitForTimeout(2_000);
    }
    log.warn('zoom admission timed out');
    return false;
  }

  /**
   * Whatever the page is saying about why we are not in the call.
   *
   * Reported verbatim rather than flattened to "not admitted": "the host has
   * another meeting in progress" and "this meeting requires sign-in" need
   * completely different responses from the operator.
   */
  private async readBlockingMessage(page: Page): Promise<string> {
    const patterns = [
      /waiting for the host/i,
      /host will let you in/i,
      /meeting has (?:not started|ended)/i,
      /requires? sign|sign in to join/i,
      /denied|removed|blocked/i,
      /passcode|password/i,
      /invalid meeting/i,
    ];
    for (const pattern of patterns) {
      try {
        // `getByText` takes the RegExp directly; building a `text=` selector
        // string from it stringifies the object instead of matching with it.
        const el = page.getByText(pattern).first();
        if (await el.isVisible({ timeout: 500 })) {
          const text = (await el.textContent())?.trim();
          if (text) return text.slice(0, 200).toLowerCase();
        }
      } catch {
        // next
      }
    }
    return 'not admitted within timeout';
  }

  private async openChat(page: Page): Promise<void> {
    const chat = await this.findAcross(page, [
      'button[aria-label*="open the chat panel" i]',
      'button[aria-label*="chat" i]',
      '.footer-button__chat-icon',
    ]);
    if (!chat) throw new Error('[@hal/agent zoom] chat button not found');
    await chat.click({ timeout: 5_000 });
  }

  private async postDisclosure(page: Page, disclosure: string, log: Logger): Promise<void> {
    try {
      await this.openChat(page);
      await this.sendChat(page, disclosure);
      log.info('disclosure posted to zoom chat');
    } catch (e) {
      // A meeting where the host disabled chat must not stop the recording —
      // but it does have to be loud, because the disclosure is the thing that
      // makes recording other people acceptable at all.
      log.error(
        { err: (e as Error).message },
        'COULD NOT POST DISCLOSURE — participants have not been told Hal is recording',
      );
      throw e;
    }
  }

  private async sendChat(page: Page, text: string): Promise<void> {
    const input = await this.findAcross(page, [
      'textarea[aria-label*="Type message here" i]',
      '.chat-box__chat-textarea',
      'div[contenteditable="true"][aria-label*="message" i]',
      'textarea[placeholder*="message" i]',
    ]);
    if (!input) throw new Error('[@hal/agent zoom] chat input not found');
    await input.fill(text);
    await input.press('Enter');
  }

  private watchChatAndStatus(
    page: Page,
    emit: (e: RuntimeEvent) => void,
    log: Logger,
  ): () => void {
    const seen = new Set<string>();
    const interval = setInterval(() => {
      void (async () => {
        try {
          const items = await page.locator('[class*="chat-item"], [id^="chat-list-item"]').all();
          for (const item of items) {
            const text = ((await item.textContent()) ?? '').trim();
            if (!text || seen.has(text)) continue;
            seen.add(text);

            // Zoom renders "Name 12:01 PM message" in one node; the sender is
            // the first line when the message is rendered with a header, and
            // absent on consecutive messages from the same person.
            const [head, ...rest] = text.split('\n');
            const body = (rest.join('\n') || head || '').trim();
            const from = rest.length ? (head ?? 'unknown').trim() : 'unknown';

            emit({ kind: 'chat-message', from, text: body });
            if (body.toLowerCase().startsWith('/hal stop')) {
              emit({ kind: 'kill-requested', from });
            }
          }

          const gone = await page
            .locator('text=/removed from the meeting|meeting has ended|host has ended/i')
            .first()
            .isVisible()
            .catch(() => false);
          if (gone) emit({ kind: 'kicked', reason: 'meeting ended or Hal was removed' });
        } catch (e) {
          log.debug({ err: (e as Error).message }, 'zoom chat poll error (will retry)');
        }
      })();
    }, 2_500);

    return () => clearInterval(interval);
  }

  private async leaveCall(page: Page): Promise<void> {
    const leave = await this.findAcross(page, [
      'button[aria-label*="Leave" i]',
      '.footer__leave-btn',
      'button:has-text("Leave")',
    ]);
    if (leave) {
      await leave.click({ timeout: 5_000 });
      // Zoom asks to confirm with a second "Leave Meeting" button.
      const confirm = await this.findAcross(page, [
        'button:has-text("Leave Meeting")',
        '.leave-meeting-options__btn',
      ]);
      if (confirm) await confirm.click({ timeout: 3_000 }).catch(() => undefined);
    }
  }

  /**
   * Find the first matching element in the page or in any of its frames.
   *
   * The web client moves parts of the UI in and out of iframes between
   * versions, so a page-only locator works until the day it silently does not.
   */
  private async findAcross(page: Page, selectors: string[]) {
    for (const sel of selectors) {
      try {
        const inPage = page.locator(sel).first();
        if (await inPage.isVisible({ timeout: 1_500 })) return inPage;
      } catch {
        // next selector
      }
    }
    for (const frame of page.frames()) {
      for (const sel of selectors) {
        try {
          const inFrame = frame.locator(sel).first();
          if (await inFrame.isVisible({ timeout: 750 })) return inFrame;
        } catch {
          // next
        }
      }
    }
    return null;
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
