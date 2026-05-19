/**
 * The four design questions every meeting agent quietly answers.
 * Hal answers them in plain text — full-width, numbered, alternating sides.
 */
const questions = [
  {
    n: '01',
    q: 'How does Hal enter the meeting?',
    a: 'Native SDKs where they exist — Zoom Meeting SDK, Microsoft Teams Bot Framework. A hardened headless Chromium worker for Google Meet (because Meet has no production bot API). Whatever the platform, Hal joins like a participant, on a real connection, with real audio.',
    chips: ['Zoom Meeting SDK', 'Teams Bot Framework', 'Headless Chromium'],
    visual: <V1 />,
  },
  {
    n: '02',
    q: 'Who does Hal speak as?',
    a: 'Bot-as-delegate. Never deepfake. Hal joins as "Hal · AI for &lt;your name&gt;" and announces itself on entry. Voice cloning is opt-in, requires a recorded consent step, and every generated clip is watermarked and audit-logged. You can always disable speaking entirely.',
    chips: ['Disclosed', 'Consent-gated', 'Audit-logged', 'Kill switch'],
    visual: <V2 />,
  },
  {
    n: '03',
    q: 'When does Hal show up?',
    a: 'Connect Google Calendar or Microsoft 365 once. For each meeting, set policy — auto-join, ask first, or ignore. Hal subscribes to your calendar via push, so when a 10:30 sync becomes a 10:45 sync, Hal updates. Recurring meetings inherit your policy.',
    chips: ['Calendar push', 'Per-meeting policy', 'Recurring inheritance', 'On-time joins'],
    visual: <V3 />,
  },
  {
    n: '04',
    q: 'What does Hal do after the call?',
    a: 'Transcript. Summary. Action items. Drafted follow-up email (for your review, not auto-sent). Optional CRM updates, Notion handoffs, calendar holds for promised next steps. Hal is opinionated about not pretending decisions were made when they weren\'t.',
    chips: ['Transcripts', 'Drafted follow-ups', 'CRM + Notion', 'Audit trail'],
    visual: <V4 />,
  },
];

export function LandingFourQuestions() {
  return (
    <section className="bg-lush-green">
      <div className="mx-auto max-w-[1280px] px-5 lg:px-8 py-24 lg:py-32">
        <div className="flex flex-col gap-4 max-w-[760px] mb-16">
          <span className="text-[11px] font-bold uppercase tracking-adora text-ink/65">
            The four questions
          </span>
          <h2 className="font-display font-bold tracking-adora text-ink text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.05]">
            Every meeting agent answers these.
            <br />
            <span className="text-ink/70">Hal answers them out loud.</span>
          </h2>
        </div>

        <div className="brutal-border-2 bg-canvas-white">
          {questions.map((it, i) => (
            <article
              key={it.n}
              className={`grid lg:grid-cols-[1.25fr_1fr] gap-0 ${
                i < questions.length - 1 ? 'border-b border-ink' : ''
              }`}
            >
              {/* Text column */}
              <div
                className={`p-7 lg:p-12 flex flex-col gap-5 ${
                  i % 2 === 1 ? 'lg:order-2' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="font-display text-[44px] lg:text-[64px] font-bold tracking-compress text-ink/15 leading-none">
                    {it.n}
                  </span>
                  <span className="font-display text-[10px] font-bold uppercase tracking-adora text-ink/55">
                    Question {it.n} / 04
                  </span>
                </div>
                <h3
                  className="font-display text-[28px] lg:text-[36px] font-bold tracking-adora text-ink leading-[1.1]"
                  dangerouslySetInnerHTML={{ __html: it.q }}
                />
                <p
                  className="text-[16px] lg:text-[17px] text-ink/80 leading-[1.6] max-w-[560px]"
                  dangerouslySetInnerHTML={{ __html: it.a }}
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {it.chips.map((c) => (
                    <span
                      key={c}
                      className="inline-flex h-7 items-center px-3 brutal-border bg-canvas-white text-[11px] font-bold uppercase tracking-adora text-ink"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Visual column */}
              <div
                className={`p-7 lg:p-12 flex items-center justify-center bg-lush-green/50 ${
                  i % 2 === 1 ? 'lg:order-1 lg:border-r border-ink' : 'lg:border-l border-ink'
                }`}
              >
                <div className="w-full max-w-[380px]">{it.visual}</div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function V1() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        { name: 'Meet', tag: 'Headless', tone: 'bg-aqua-blue' },
        { name: 'Zoom', tag: 'SDK', tone: 'bg-sunset-pink' },
        { name: 'Teams', tag: 'SDK', tone: 'bg-action-violet text-canvas-white' },
      ].map((p) => (
        <div key={p.name} className={`aspect-[3/4] brutal-border-2 ${p.tone} p-3 flex flex-col justify-between`}>
          <span className="text-[10px] font-bold uppercase tracking-adora">{p.tag}</span>
          <span className="font-display text-[18px] font-bold tracking-adora">{p.name}</span>
        </div>
      ))}
    </div>
  );
}

function V2() {
  return (
    <div className="brutal-border-2 bg-canvas-white p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-bold uppercase tracking-adora text-ink/55">Identity</span>
        <span className="inline-flex h-6 items-center px-2 bg-electric-green text-ink text-[10px] font-bold uppercase tracking-adora">
          disclosed
        </span>
      </div>
      <div className="brutal-border bg-action-violet text-canvas-white p-4 mb-3">
        <div className="text-[11px] font-bold uppercase tracking-adora opacity-80 mb-1">Display name</div>
        <div className="font-display text-[18px] font-bold tracking-adora">HAL · AI</div>
        <div className="text-[12px] opacity-80">for Hal Okorie</div>
      </div>
      <ul className="flex flex-col gap-1.5 text-[12.5px] text-ink/75">
        <li className="flex items-center gap-2"><Check /> Announces on join</li>
        <li className="flex items-center gap-2"><Check /> Voice clone opt-in only</li>
        <li className="flex items-center gap-2"><Check /> Every utterance audit-logged</li>
      </ul>
    </div>
  );
}

function V3() {
  return (
    <div className="brutal-border-2 bg-canvas-white p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-bold uppercase tracking-adora text-ink/55">Tomorrow</span>
        <span className="text-[10px] font-bold uppercase tracking-adora text-ink/55">4 events</span>
      </div>
      <ul className="flex flex-col">
        {[
          { t: '09:00', name: 'Standup', mode: 'Ignore', tone: 'text-ink/45' },
          { t: '10:30', name: 'Launch review', mode: 'Auto-join', tone: 'text-action-violet' },
          { t: '13:00', name: 'Design sync', mode: 'Ask first', tone: 'text-ink' },
          { t: '15:30', name: 'Investor update', mode: 'Auto-join', tone: 'text-action-violet' },
        ].map((e) => (
          <li key={e.t} className="flex items-center gap-3 py-2 border-t border-ink/10 first:border-t-0">
            <span className="font-mono-grit text-[11px] text-ink/65 w-12">{e.t}</span>
            <span className="flex-1 text-[13px] text-ink font-medium">{e.name}</span>
            <span className={`text-[10px] font-bold uppercase tracking-adora ${e.tone}`}>{e.mode}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function V4() {
  return (
    <div className="brutal-border-2 bg-canvas-white p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-bold uppercase tracking-adora text-ink/55">After the meeting</span>
        <span className="inline-flex h-6 items-center px-2 bg-electric-green text-ink text-[10px] font-bold uppercase tracking-adora">
          drafted
        </span>
      </div>
      <ul className="flex flex-col gap-2.5">
        {[
          { tag: 'Email', body: 'Follow-up to support@ · ready for review' },
          { tag: 'CRM', body: 'Updated Acme deal stage to "Proposal sent"' },
          { tag: 'Cal', body: 'Held 15 min Friday for launch announcement' },
          { tag: 'Notion', body: 'Logged 4 decisions, 2 open questions' },
        ].map((it) => (
          <li key={it.tag} className="flex items-center gap-3 p-2 brutal-border bg-lush-green/40">
            <span className="text-[10px] font-bold uppercase tracking-adora text-ink bg-canvas-white px-1.5 py-0.5 brutal-border">
              {it.tag}
            </span>
            <span className="text-[12.5px] text-ink/85">{it.body}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2 6 L 5 9 L 10 3" stroke="#0b0b0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
