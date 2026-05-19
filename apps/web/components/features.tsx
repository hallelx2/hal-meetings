import { AccentCard, Badge } from '@hal/ui';

export function Features() {
  return (
    <section id="features" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-[1240px] px-6 lg:px-10 flex flex-col gap-12">
        <div className="flex flex-col items-start gap-4 max-w-[720px]">
          <Badge tone="neon">Three modes, one agent</Badge>
          <h2 className="font-display font-bold tracking-adora text-rich-violet text-[36px] lg:text-[52px] leading-[1.05]">
            Listens. Speaks. Acts.
          </h2>
          <p className="text-slate-text/75 text-[18px] leading-[1.55] max-w-[620px]">
            Start with listen-only. Promote to chat-on-behalf when you trust it.
            Enable speak-on-behalf with full guardrails when you're ready. You're always in control.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          <AccentCard accent="air-blue" className="text-rich-violet">
            <FeatureContent
              label="01 · Listen"
              title="Captures every word, surfaces what matters."
              points={[
                'Speaker-diarized transcripts',
                'Action items, decisions, open questions',
                'Sentiment + engagement signals (optional)',
                'Searchable across every past meeting',
              ]}
              illo={<ListenIllo />}
            />
          </AccentCard>

          <AccentCard accent="lush-green" className="text-rich-violet">
            <FeatureContent
              label="02 · Speak"
              title="A delegate that knows when to talk."
              points={[
                'Bot-as-delegate identity, always disclosed',
                'Pre-meeting brief: goals, talking points, hard nos',
                'Confidence threshold before speaking',
                'Kill switch — dial in and Hal mutes',
              ]}
              illo={<SpeakIllo />}
            />
          </AccentCard>

          <AccentCard accent="sunset-pink" className="text-rich-violet">
            <FeatureContent
              label="03 · Act"
              title="The work after the meeting, done."
              points={[
                'Drafted follow-up emails, for your review',
                'CRM updates: Salesforce, HubSpot, Attio',
                'Calendar holds for promised next steps',
                'Notion / Linear / Slack handoffs',
              ]}
              illo={<ActIllo />}
            />
          </AccentCard>
        </div>
      </div>
    </section>
  );
}

function FeatureContent({
  label,
  title,
  points,
  illo,
}: {
  label: string;
  title: string;
  points: string[];
  illo: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <span className="font-display text-[13px] font-semibold uppercase tracking-adora text-rich-violet/70">
          {label}
        </span>
        <div className="h-10 w-10 rounded-2xl bg-canvas-white/70 flex items-center justify-center text-rich-violet">
          {illo}
        </div>
      </div>
      <h3 className="font-display text-[28px] lg:text-[32px] font-semibold tracking-adora text-rich-violet leading-[1.1]">
        {title}
      </h3>
      <ul className="flex flex-col gap-2.5 mt-2">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-3 text-[15px] text-rich-violet/90 leading-[1.5]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-1 flex-shrink-0" aria-hidden>
              <path d="M3 8 l3 3 l7 -7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ListenIllo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M3 12 v0 M7 8 v8 M11 5 v14 M15 9 v6 M19 11 v2 M23 12 v0" />
    </svg>
  );
}

function SpeakIllo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 10 v4 a2 2 0 0 0 2 2 h2 l4 3 v-14 l-4 3 H7 a2 2 0 0 0 -2 2 z" />
      <path d="M17 9 a4 4 0 0 1 0 6" />
    </svg>
  );
}

function ActIllo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12 l4 4 l10 -10" />
    </svg>
  );
}
