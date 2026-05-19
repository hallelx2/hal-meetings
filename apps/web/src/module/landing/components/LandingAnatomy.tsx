/**
 * "Hal's first week" — two adjacent checklist-style cards. Mirrors Roomote's
 * onboarding moment with sticky note energy.
 */
const setup = [
  'Connect Google Calendar or Microsoft 365',
  'Connect Google Meet, Zoom, and Teams',
  'Upload your meeting persona (optional)',
  'Configure per-meeting policy: auto, ask, ignore',
  'Connect your CRM (HubSpot, Salesforce, Attio)',
  'Connect Notion / Linear / Slack for follow-ups',
];

const weekOne = [
  {
    label: 'Day 0',
    badge: 'Get started',
    body: 'Hal indexes the next 7 days of meetings. You set policies for each one.',
  },
  {
    label: 'Day 1–3',
    badge: 'Listen-only',
    body: 'Hal joins as a disclosed participant. Listens, transcribes, emails you summaries.',
  },
  {
    label: 'Day 4–6',
    badge: 'Get comfortable',
    body: 'Enable chat-on-behalf in low-stakes meetings. Hal answers logistics in the chat for you.',
  },
  {
    label: 'Day 7+',
    badge: 'Speak mode',
    body: 'Toggle voice-on-behalf for meetings you trust Hal with. Always disclosed. Kill switch always on.',
  },
];

export function LandingAnatomy() {
  return (
    <section id="how" className="bg-lush-green">
      <div className="mx-auto max-w-[1280px] px-5 lg:px-8 py-24 lg:py-32">
        <div className="flex flex-col gap-4 max-w-[720px] mb-12">
          <span className="text-[11px] font-bold uppercase tracking-adora text-ink/65">
            How it works
          </span>
          <h2 className="font-display font-bold tracking-adora text-ink text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.05]">
            A meeting agent that onboards itself
            <br />
            <span className="text-ink/70">and starts taking calls on day one.</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Setup checklist */}
          <article className="brutal-border-2 bg-canvas-white p-6 lg:p-8 flex flex-col gap-5 -rotate-[0.5deg]">
            <header className="flex items-center justify-between gap-3 pb-4 border-b border-ink/15">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-adora text-ink/55">May 19</div>
                <h3 className="font-display text-[22px] font-bold tracking-adora text-ink">
                  Hal's onboarding checklist
                </h3>
              </div>
              <span className="inline-flex h-7 items-center px-3 bg-electric-green text-ink text-[11px] font-bold uppercase tracking-adora brutal-border">
                ~12 min
              </span>
            </header>
            <p className="text-[14px] text-ink/65 italic">
              Hal makes itself part of your team
            </p>
            <ul className="flex flex-col">
              {setup.map((item, i) => (
                <li
                  key={item}
                  className="flex items-center gap-3 py-2.5 border-t border-ink/10 first:border-t-0"
                >
                  <span className="h-5 w-5 brutal-border bg-canvas-white flex items-center justify-center flex-shrink-0">
                    {i < 2 ? (
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
                        <path
                          d="M2 6 L 5 9 L 10 3"
                          stroke="#0b0b0b"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                  </span>
                  <span className={`text-[15px] ${i < 2 ? 'text-ink/55 line-through' : 'text-ink'}`}>
                    {item}
                  </span>
                </li>
              ))}
              <li className="pt-3 text-[12px] text-ink/45 italic">
                Add an integration (Hal helps you pick one)
              </li>
            </ul>
          </article>

          {/* Week one schedule */}
          <article className="brutal-border-2 bg-canvas-white p-6 lg:p-8 flex flex-col gap-5 rotate-[0.5deg]">
            <header className="pb-4 border-b border-ink/15">
              <div className="text-[11px] font-bold uppercase tracking-adora text-ink/55">
                What to expect
              </div>
              <h3 className="font-display text-[22px] font-bold tracking-adora text-ink">
                Hal's first week
              </h3>
            </header>
            <ul className="flex flex-col gap-5">
              {weekOne.map((w) => (
                <li key={w.label} className="grid grid-cols-[80px_1fr] items-start gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="inline-flex w-fit h-6 items-center px-2 bg-ink text-canvas-white text-[10px] font-bold uppercase tracking-adora">
                      {w.label}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-adora text-ink/55">
                      {w.badge}
                    </span>
                  </div>
                  <p className="text-[14.5px] text-ink/85 leading-[1.5]">{w.body}</p>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
