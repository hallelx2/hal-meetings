/**
 * Resend transactional email adapter. Used to email the user a meeting summary
 * once the bot leaves. We send markdown rendered to plaintext + a basic HTML
 * wrapper. Nothing fancy.
 */
export interface ResendOptions {
  apiKey: string;
  endpoint?: string;
}

export interface SendEmailInput {
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailSender {
  send(input: SendEmailInput): Promise<{ id: string }>;
}

export class ResendEmailSender implements EmailSender {
  private readonly endpoint: string;

  constructor(private readonly opts: ResendOptions) {
    if (!opts.apiKey) throw new Error('[@hal/agent email] resend apiKey missing');
    this.endpoint = opts.endpoint ?? 'https://api.resend.com';
  }

  async send(input: SendEmailInput): Promise<{ id: string }> {
    const res = await fetch(`${this.endpoint}/emails`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${this.opts.apiKey}`,
      },
      body: JSON.stringify({
        from: input.from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        ...(input.html ? { html: input.html } : {}),
      }),
    });
    if (!res.ok) {
      throw new Error(`[@hal/agent email] resend HTTP ${res.status}: ${await res.text()}`);
    }
    const body = (await res.json()) as { id: string };
    return { id: body.id };
  }
}

export class NullEmailSender implements EmailSender {
  // eslint-disable-next-line @typescript-eslint/require-await
  async send(input: SendEmailInput): Promise<{ id: string }> {
    return { id: `null-${Date.now()}` };
  }
}
