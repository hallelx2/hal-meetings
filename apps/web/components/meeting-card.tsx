/**
 * The hero centerpiece: a faux "live meeting" UI showing Hal in attendance,
 * a streaming transcript, and bot-as-delegate disclosure. CSS animations only.
 */
import { cn } from '@hal/ui';

const transcriptLines = [
  { speaker: 'Maya', delay: 0, text: '…so the launch date slipped a week, but QA signed off this morning.' },
  { speaker: 'Hal (AI · for Hal Okorie)', delay: 800, text: 'Noted. I\'ll move the release announcement to next Friday and update the launch doc.', mine: true },
  { speaker: 'Devon', delay: 1700, text: 'Perfect. Can someone also loop in support before then?' },
  { speaker: 'Hal (AI · for Hal Okorie)', delay: 2600, text: 'Drafting an email to support@ now — I\'ll send it for review after the call.', mine: true },
];

export function MeetingCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative w-full max-w-[920px] mx-auto rounded-[28px] border border-cloud-mist/80 bg-canvas-white',
        'shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_40px_80px_-32px_rgba(33,22,76,0.18),0_18px_40px_-24px_rgba(89,46,255,0.12)]',
        'overflow-hidden',
        className,
      )}
      role="img"
      aria-label="A live Google Meet call where Hal is in attendance on the user's behalf and contributing to the conversation."
    >
      {/* Top chrome — fake browser/meeting bar */}
      <div className="flex items-center justify-between gap-4 px-5 h-11 border-b border-cloud-mist/70 bg-soft-gray-fill/40">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-2 text-[12px] text-slate-text/60 font-medium">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-electric-green cursor-blink" />
          meet.google.com · launch-review · 11:00 AM
        </div>
        <div className="w-12" />
      </div>

      {/* Body: 3 participant tiles + transcript */}
      <div className="grid md:grid-cols-[1.1fr_1fr] gap-0">
        {/* Tiles */}
        <div className="p-5 grid grid-cols-2 gap-3 bg-[#0e0a1f]">
          <Participant name="Maya Chen" tone="aqua" speaking={false} />
          <Participant name="Devon Park" tone="pink" speaking={false} />
          <Participant
            name="Hal · AI"
            tone="violet"
            speaking
            badge="for Hal Okorie"
          />
          <Participant name="Priya R." tone="green" speaking={false} />
        </div>

        {/* Transcript stream */}
        <div className="p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-display text-[13px] font-semibold uppercase tracking-adora text-rich-violet">
              Live transcript
            </span>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-electric-green">
              <span className="h-1.5 w-1.5 rounded-full bg-electric-green cursor-blink" />
              Recording · Hal joined
            </span>
          </div>

          <ul className="flex flex-col gap-3 text-[14px] leading-[1.5]">
            {transcriptLines.map((line, i) => (
              <li
                key={i}
                className={cn(
                  'line-in flex flex-col gap-1 rounded-2xl px-3.5 py-2.5',
                  line.mine
                    ? 'bg-action-violet/[0.06] border border-action-violet/15'
                    : 'bg-soft-gray-fill/50',
                )}
                style={{ animationDelay: `${line.delay}ms` }}
              >
                <span
                  className={cn(
                    'text-[11px] font-semibold uppercase tracking-adora',
                    line.mine ? 'text-action-violet' : 'text-slate-text/55',
                  )}
                >
                  {line.speaker}
                </span>
                <span className="text-slate-text">{line.text}</span>
              </li>
            ))}
            <li className="flex items-center gap-1.5 text-[12px] text-slate-text/55 line-in" style={{ animationDelay: '3400ms' }}>
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
  tone,
  speaking,
  badge,
}: {
  name: string;
  tone: 'violet' | 'aqua' | 'pink' | 'green';
  speaking?: boolean;
  badge?: string;
}) {
  const bg = {
    violet: 'bg-action-violet',
    aqua: 'bg-aqua-blue',
    pink: 'bg-neon-pink',
    green: 'bg-electric-green',
  }[tone];

  return (
    <div
      className={cn(
        'relative aspect-video rounded-2xl overflow-hidden bg-[#1a1233]',
        speaking && 'ring-2 ring-electric-green/80',
      )}
    >
      <div className={cn('absolute inset-0 opacity-[0.85]', bg)} />
      <div className="absolute inset-0 bg-gradient-to-tr from-[#0e0a1f]/70 via-transparent to-transparent" />
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-canvas-white bg-[#0e0a1f]/55 backdrop-blur-sm rounded-md px-2 py-1">
          {name}
        </span>
        {badge ? (
          <span className="text-[10px] font-medium text-canvas-white bg-action-violet rounded-md px-1.5 py-1 uppercase tracking-adora">
            {badge}
          </span>
        ) : null}
      </div>
    </div>
  );
}
