import { Badge } from '@hal/ui';

const steps = [
  {
    n: '01',
    tone: 'aqua' as const,
    title: 'How does Hal enter?',
    body:
      'Native SDKs where they exist — Zoom and Microsoft Teams. A hardened headless browser worker for Google Meet. Hal always identifies as a bot.',
    chips: ['Zoom SDK', 'Teams Bot Framework', 'Headless Chromium'],
  },
  {
    n: '02',
    tone: 'violet' as const,
    title: 'Who does Hal speak as?',
    body:
      'Bot-as-delegate, never deepfake. Hal joins as "Hal · AI" with your name visibly attached. Voice cloning is opt-in, logged, and watermarked.',
    chips: ['Disclosed', 'Consent-required', 'Audit logged'],
  },
  {
    n: '03',
    tone: 'electric' as const,
    title: 'When does Hal show up?',
    body:
      'Connect Google Calendar or Microsoft 365 once. Set per-meeting policy: auto-join, ask-first, or ignore. Hal does the rest, on time.',
    chips: ['Calendar push', 'Per-meeting policy', 'On-time joins'],
  },
  {
    n: '04',
    tone: 'neon' as const,
    title: 'What does Hal do after?',
    body:
      'Transcript, summary, action items. Drafted follow-up emails for your review. Optional CRM updates, calendar holds, and doc syncs.',
    chips: ['Transcripts', 'Drafted follow-ups', 'CRM + Notion'],
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-[1240px] px-6 lg:px-10">
        <div className="flex flex-col items-start gap-4 max-w-[720px]">
          <Badge tone="violet">Four questions. One answer.</Badge>
          <h2 className="font-display font-bold tracking-adora text-rich-violet text-[36px] lg:text-[52px] leading-[1.05]">
            Every meeting agent answers four questions.{' '}
            <span className="text-action-violet">Hal answers them out loud.</span>
          </h2>
          <p className="text-slate-text/75 text-[18px] leading-[1.55] max-w-[620px]">
            Most products hide the design decisions that actually matter. Here are ours, in
            plain text — because how a bot enters your meeting, what voice it uses, when it
            shows up, and what it does after are not implementation details.
          </p>
        </div>

        <div className="mt-14 lg:mt-20 grid sm:grid-cols-2 gap-5 lg:gap-6">
          {steps.map((s) => (
            <article
              key={s.n}
              className="group relative rounded-cards border border-cloud-mist/80 bg-canvas-white p-7 lg:p-10 flex flex-col gap-4 transition-all hover:border-action-violet/30 hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-[14px] font-semibold tracking-adora text-slate-text/40">
                  {s.n}
                </span>
                <Badge tone={s.tone}>Hal</Badge>
              </div>

              <h3 className="font-display text-[26px] lg:text-[30px] font-semibold tracking-adora text-rich-violet leading-[1.1]">
                {s.title}
              </h3>
              <p className="text-slate-text/80 text-[16px] leading-[1.55]">{s.body}</p>

              <div className="mt-2 flex flex-wrap gap-2">
                {s.chips.map((c) => (
                  <span
                    key={c}
                    className="inline-flex h-7 items-center rounded-badges border border-cloud-mist bg-soft-gray-fill/40 px-3 text-[12px] font-medium text-slate-text/80 tracking-adora"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
