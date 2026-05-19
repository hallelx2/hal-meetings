/**
 * Honest pre-alpha roadmap. Numbered phases, each with status, in a vertical
 * list with hard borders.
 */
type Status = 'shipped' | 'in-progress' | 'next' | 'planned';

const phases: { n: string; title: string; body: string; status: Status; eta: string }[] = [
  {
    n: 'P0',
    title: 'Meet · listen-only',
    body: 'Headless Chromium bot joins Google Meet as a disclosed participant. Transcribes. Emails you a summary. Manually triggered with a URL.',
    status: 'in-progress',
    eta: 'June 2026',
  },
  {
    n: 'P1',
    title: 'Calendar auto-join',
    body: 'Google Calendar + Microsoft 365. Per-meeting policy: auto, ask, ignore. Hal joins on time, every time.',
    status: 'next',
    eta: 'July 2026',
  },
  {
    n: 'P2',
    title: 'Chat on behalf',
    body: 'Hal posts in the meeting chat for you — answers logistics, drops links, surfaces docs. Controlled action surface before audio.',
    status: 'planned',
    eta: 'August 2026',
  },
  {
    n: 'P3',
    title: 'Speak on behalf',
    body: 'Voice mode, opt-in. Pre-meeting brief. Confidence threshold before speaking. Kill switch. Audit log of every utterance.',
    status: 'planned',
    eta: 'September 2026',
  },
  {
    n: 'P4',
    title: 'Zoom SDK worker',
    body: 'Native Zoom Meeting SDK worker for higher-quality audio and stable join behavior. Marketplace submission.',
    status: 'planned',
    eta: 'October 2026',
  },
  {
    n: 'P5',
    title: 'Teams SDK worker',
    body: 'Microsoft Teams Bot Framework integration. Calling and meeting bot. Partner Center submission.',
    status: 'planned',
    eta: 'November 2026',
  },
  {
    n: 'P6',
    title: 'Post-meeting action layer',
    body: 'CRM updates (HubSpot, Salesforce, Attio). Notion / Linear handoffs. Calendar holds. All drafted, never auto-sent.',
    status: 'planned',
    eta: 'Q4 2026',
  },
];

const statusLabel: Record<Status, { label: string; bg: string; text: string }> = {
  shipped: { label: 'Shipped', bg: 'bg-electric-green', text: 'text-ink' },
  'in-progress': { label: 'In progress', bg: 'bg-action-violet', text: 'text-canvas-white' },
  next: { label: 'Up next', bg: 'bg-aqua-blue', text: 'text-ink' },
  planned: { label: 'Planned', bg: 'bg-canvas-white', text: 'text-ink' },
};

export function LandingRoadmap() {
  return (
    <section id="roadmap" className="bg-lush-green">
      <div className="mx-auto max-w-[1280px] px-5 lg:px-8 py-24 lg:py-32">
        <div className="flex flex-col gap-4 max-w-[760px] mb-12">
          <span className="text-[11px] font-bold uppercase tracking-adora text-ink/65">
            Roadmap · pre-alpha honest
          </span>
          <h2 className="font-display font-bold tracking-adora text-ink text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.05]">
            What's shipped. What's next.
            <br />
            <span className="text-ink/70">No mystery boxes.</span>
          </h2>
          <p className="text-ink/75 text-[17px] leading-[1.55] max-w-[600px]">
            Hal sequences by the hardest engineering problem first — joining meetings
            reliably — not by the most demoable feature. ETAs are best-effort estimates
            from a one-person team. They will slip. The roadmap will not.
          </p>
        </div>

        <div className="brutal-border-2 bg-canvas-white">
          {phases.map((p, i) => (
            <article
              key={p.n}
              className={`grid grid-cols-[80px_1fr_auto] lg:grid-cols-[120px_1fr_auto_140px] gap-4 lg:gap-6 items-start p-5 lg:p-7 ${
                i < phases.length - 1 ? 'border-b border-ink/15' : ''
              }`}
            >
              <span className="font-display text-[28px] lg:text-[36px] font-bold tracking-compress text-ink/15 leading-none">
                {p.n}
              </span>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-display text-[18px] lg:text-[22px] font-bold tracking-adora text-ink">
                  {p.title}
                </h3>
                <p className="text-[14.5px] text-ink/70 leading-[1.5] max-w-[640px]">{p.body}</p>
              </div>
              <span
                className={`inline-flex h-7 items-center px-3 brutal-border text-[11px] font-bold uppercase tracking-adora ${statusLabel[p.status].bg} ${statusLabel[p.status].text}`}
              >
                {statusLabel[p.status].label}
              </span>
              <span className="hidden lg:block text-[12px] font-bold uppercase tracking-adora text-ink/55 text-right pt-1">
                {p.eta}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
