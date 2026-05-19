import { cn } from '@hal/ui';

/**
 * The Hal-in-attendance product mockup. Neo-brutalist treatment:
 * hard black border, no shadow, flat. Slight rotation for the
 * hand-pinned-to-the-page feel.
 */
const transcriptLines = [
  { speaker: 'Maya', delay: 0, text: '…so the launch date slipped a week, but QA signed off this morning.' },
  { speaker: 'Hal (AI · for Halleluyah Oludele)', delay: 800, text: "Noted. I'll move the release announcement to next Friday and update the launch doc.", mine: true },
  { speaker: 'Devon', delay: 1700, text: 'Perfect. Can someone also loop in support before then?' },
  { speaker: 'Hal (AI · for Halleluyah Oludele)', delay: 2600, text: "Drafting an email to support@ now — I'll send it for review after the call.", mine: true },
];

export function LandingMeetingMockup({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'w-full max-w-[920px] mx-auto bg-canvas-white brutal-border-2 overflow-hidden',
        className,
      )}
    >
      {/* Chrome */}
      <div className="flex items-center justify-between gap-4 px-4 h-10 border-b border-ink bg-lush-green/60">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-ink bg-canvas-white" />
          <span className="h-2.5 w-2.5 rounded-full border border-ink bg-canvas-white" />
          <span className="h-2.5 w-2.5 rounded-full border border-ink bg-canvas-white" />
        </div>
        <div className="flex items-center gap-2 text-[11px] text-ink/75 font-bold uppercase tracking-adora">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-electric-green cursor-blink" />
          meet.google.com · launch-review · 11:00 AM
        </div>
        <div className="w-12" />
      </div>

      <div className="grid md:grid-cols-[1.1fr_1fr]">
        {/* Tile grid */}
        <div className="p-4 grid grid-cols-2 gap-2 bg-ink border-r border-ink">
          <Participant name="Maya Chen" bg="bg-aqua-blue" speaking={false} />
          <Participant name="Devon Park" bg="bg-sunset-pink" speaking={false} />
          <Participant
            name="HAL · AI"
            bg="bg-action-violet text-canvas-white"
            speaking
            badge="for Halleluyah Oludele"
          />
          <Participant name="Priya R." bg="bg-lush-green" speaking={false} />
        </div>

        {/* Transcript */}
        <div className="p-5 flex flex-col gap-3 bg-canvas-white">
          <div className="flex items-center justify-between">
            <span className="font-display text-[12px] font-bold uppercase tracking-adora text-ink">
              Live transcript
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-adora text-ink/65">
              <span className="h-1.5 w-1.5 rounded-full bg-electric-green cursor-blink" />
              recording · disclosed
            </span>
          </div>

          <ul className="flex flex-col gap-2.5 text-[13.5px] leading-[1.5]">
            {transcriptLines.map((line, i) => (
              <li
                key={i}
                className={cn(
                  'line-in flex flex-col gap-0.5 p-2.5 brutal-border',
                  line.mine ? 'bg-lush-green' : 'bg-canvas-white',
                )}
                style={{ animationDelay: `${line.delay}ms` }}
              >
                <span
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-adora',
                    line.mine ? 'text-ink' : 'text-ink/55',
                  )}
                >
                  {line.speaker}
                </span>
                <span className="text-ink">{line.text}</span>
              </li>
            ))}
            <li
              className="flex items-center gap-1.5 text-[11px] text-ink/55 line-in font-bold uppercase tracking-adora"
              style={{ animationDelay: '3400ms' }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-action-violet cursor-blink" />
              Hal is listening…
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Participant({
  name,
  bg,
  speaking,
  badge,
}: {
  name: string;
  bg: string;
  speaking?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={cn(
        'relative aspect-video brutal-border overflow-hidden',
        bg,
        speaking && 'ring-[3px] ring-electric-green',
      )}
    >
      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-adora text-canvas-white bg-ink px-1.5 py-0.5">
          {name}
        </span>
        {badge ? (
          <span className="text-[9px] font-bold uppercase tracking-adora text-ink bg-canvas-white px-1.5 py-0.5 brutal-border">
            {badge}
          </span>
        ) : null}
      </div>
    </div>
  );
}
