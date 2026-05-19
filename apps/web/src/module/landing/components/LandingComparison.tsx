/**
 * Comparison table — the most Roomote-signature pattern. Hal vs. the
 * three honest alternatives.
 */
const columns = [
  {
    title: 'Do nothing',
    sub: 'The default',
    rows: [
      "Same meetings every week, same drain.",
      'No record. No summary. Pure entropy.',
      'You miss the call → you miss the context.',
    ],
  },
  {
    title: 'Otter / Read AI / Fireflies',
    sub: 'Alongside-you bots',
    rows: [
      'Joins beside you. Records. Summarizes.',
      'Cloud-only, can\'t self-host. Your transcripts live on their servers.',
      'Useless if you can\'t actually be in the meeting.',
    ],
  },
  {
    title: 'Build it yourself',
    sub: 'The Saturday plan',
    rows: [
      'Three platforms. Headless Chromium. SDK approval queues. KMS.',
      'Six weekends in, you have a Meet bot that almost works.',
      'You\'re now in the meeting-bot business, not yours.',
    ],
  },
  {
    title: 'Hal',
    sub: 'The agent that goes for you',
    highlight: true,
    rows: [
      'Joins for you when you can\'t. Speaks on your behalf, disclosed.',
      'Self-host on a VPS or use the eventual hosted plan. Same code.',
      'Encrypted by default, BYO STT/TTS/LLM. AGPL-3.0.',
    ],
  },
];

export function LandingComparison() {
  return (
    <section id="compare" className="bg-lush-green">
      <div className="mx-auto max-w-[1280px] px-5 lg:px-8 py-24 lg:py-32">
        <div className="flex flex-col gap-4 max-w-[760px] mb-12">
          <span className="text-[11px] font-bold uppercase tracking-adora text-ink/65">
            How Hal compares
          </span>
          <h2 className="font-display font-bold tracking-adora text-ink text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.05]">
            To the four honest options for skipping the meeting.
          </h2>
          <p className="text-ink/75 text-[17px] leading-[1.55] max-w-[620px]">
            Either you attend, you record, you build, or you delegate. Hal is the last column —
            and the only one that exists as a self-hostable open-source project.
          </p>
        </div>

        {/* Comparison grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 brutal-border-2 bg-canvas-white">
          {columns.map((c, i) => (
            <div
              key={c.title}
              className={`
                flex flex-col p-6 lg:p-7
                ${i < columns.length - 1 ? 'lg:border-r border-ink' : ''}
                ${c.highlight ? 'bg-ink text-canvas-white' : ''}
              `}
            >
              <div className="mb-1 text-[11px] font-bold uppercase tracking-adora opacity-60">
                {c.sub}
              </div>
              <div className="font-display text-[22px] lg:text-[24px] font-bold tracking-adora leading-[1.1] mb-5">
                {c.title}
              </div>
              <ul className="flex flex-col gap-3.5">
                {c.rows.map((r) => (
                  <li key={r} className="flex items-start gap-2.5 text-[14.5px] leading-[1.5]">
                    <span
                      className={`mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 ${
                        c.highlight ? 'bg-electric-green' : 'bg-ink'
                      }`}
                    />
                    <span className={c.highlight ? 'text-canvas-white/90' : 'text-ink/80'}>{r}</span>
                  </li>
                ))}
              </ul>
              {c.highlight && (
                <a
                  href="#waitlist"
                  className="mt-7 inline-flex h-10 items-center justify-center px-4 bg-electric-green text-ink text-[12px] font-bold uppercase tracking-adora hover:bg-canvas-white transition-colors"
                >
                  Get early access →
                </a>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 text-[12px] text-ink/55 italic">
          * Hal is pre-alpha. The comparison reflects the v1.0 product Hal is aiming at, not what's shipped today.
        </div>
      </div>
    </section>
  );
}
