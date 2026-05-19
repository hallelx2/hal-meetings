import Link from 'next/link';
import { HalWordmark } from '@/components/shared/HalWordmark';
import { LandingMeetingMockup } from './LandingMeetingMockup';

const featureLine = [
  { icon: <IconCal />, body: "Connects to Google Calendar and Microsoft 365 and decides which meetings deserve Hal." },
  { icon: <IconJoin />, body: "Joins Meet, Zoom, and Teams via official SDKs and a hardened headless browser." },
  { icon: <IconMic />, body: "Listens, takes notes, and speaks on your behalf with disclosed bot-as-delegate identity." },
  { icon: <IconBolt />, body: "Drafts follow-up emails, updates your CRM, and books the next step — for your review." },
];

export function LandingHero() {
  return (
    <section className="relative bg-lush-green overflow-hidden brutal-border-2 border-t-0 border-l-0 border-r-0">
      {/* Top: wordmark stamp */}
      <div className="mx-auto max-w-[1280px] px-5 lg:px-8 pt-14 lg:pt-20 pb-4 flex justify-center">
        <HalWordmark size="xl" className="-rotate-1" />
      </div>

      <div className="mx-auto max-w-[1280px] px-5 lg:px-8 pb-20 lg:pb-24">
        {/* Headline + sub + cta + features (left) | Mockup (right) */}
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-start">
          {/* Left — pitch */}
          <div className="flex flex-col gap-7">
            <h1 className="font-display font-bold tracking-adora text-ink text-[40px] sm:text-[52px] lg:text-[62px] leading-[1.02]">
              The meeting agent <br />
              for{' '}
              <span className="sketch-underline">people</span>{' '}
              who'd rather <br />
              build than attend.
            </h1>

            <p className="text-ink/80 text-[17px] lg:text-[19px] leading-[1.55] max-w-[560px]">
              Hal autonomously joins your Google Meet, Zoom, and Microsoft Teams calls on
              your behalf — listens, takes notes, speaks when you want it to, and follows
              up after. Your tokens, your transcripts, your infra. Open source.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="#waitlist"
                className="inline-flex h-12 items-center px-6 bg-ink text-canvas-white text-[14px] font-bold uppercase tracking-adora hover:bg-ink-soft transition-colors"
              >
                Get early access
              </Link>
              <Link
                href="#self-host"
                className="inline-flex h-12 items-center px-6 brutal-border-2 bg-canvas-white text-ink text-[14px] font-bold uppercase tracking-adora hover:bg-lush-green transition-colors"
              >
                Self-host it instead
              </Link>
            </div>

            {/* Feature checklist — Roomote signature pattern */}
            <ul className="mt-6 flex flex-col">
              {featureLine.map((f, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[28px_1fr] items-start gap-4 py-3.5 border-t border-ink/25 first:border-t-0"
                >
                  <span className="mt-0.5 flex items-center justify-center text-ink">{f.icon}</span>
                  <span className="text-[15px] text-ink/85 leading-[1.5]">{f.body}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right — meeting mockup with hand-drawn callouts */}
          <div className="relative">
            {/* Hand-drawn callouts (desktop only) */}
            <Callouts />
            <div className="relative rotate-[0.6deg]">
              <LandingMeetingMockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Callouts() {
  return (
    <>
      {/* "Speaks on your behalf" — points at the violet tile */}
      <svg
        className="absolute hidden lg:block z-10 -left-32 top-32 w-[180px] h-[120px] text-ink"
        viewBox="0 0 180 120"
        fill="none"
        aria-hidden
      >
        <path
          d="M10 20 C 30 22, 50 30, 90 60 C 110 76, 130 86, 156 92"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="3 4"
        />
        <path d="M150 84 L 158 92 L 148 98" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="0" y="14" fontFamily="ui-sans-serif" fontSize="13" fontWeight="700" letterSpacing="-0.02em" fill="currentColor">
          Hal · disclosed,
        </text>
        <text x="0" y="30" fontFamily="ui-sans-serif" fontSize="13" fontWeight="700" letterSpacing="-0.02em" fill="currentColor">
          speaks on your behalf
        </text>
      </svg>

      {/* "Live transcript" — points at the right column */}
      <svg
        className="absolute hidden lg:block z-10 -right-28 -top-2 w-[170px] h-[100px] text-ink"
        viewBox="0 0 170 100"
        fill="none"
        aria-hidden
      >
        <path
          d="M160 16 C 130 22, 95 26, 60 50"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="3 4"
        />
        <path d="M68 44 L 60 50 L 66 58" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="80" y="10" fontFamily="ui-sans-serif" fontSize="13" fontWeight="700" letterSpacing="-0.02em" fill="currentColor" textAnchor="start">
          Live transcript,
        </text>
        <text x="80" y="26" fontFamily="ui-sans-serif" fontSize="13" fontWeight="700" letterSpacing="-0.02em" fill="currentColor" textAnchor="start">
          diarized in real-time
        </text>
      </svg>

      {/* "Hal" badge — points at the bottom of mockup */}
      <svg
        className="absolute hidden lg:block z-10 -bottom-10 -left-10 w-[220px] h-[90px] text-ink"
        viewBox="0 0 220 90"
        fill="none"
        aria-hidden
      >
        <path
          d="M16 70 C 40 60, 80 40, 130 26"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="3 4"
        />
        <path d="M122 20 L 132 26 L 124 36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="0" y="80" fontFamily="ui-sans-serif" fontSize="13" fontWeight="700" letterSpacing="-0.02em" fill="currentColor">
          Always named after you · never deepfake
        </text>
      </svg>
    </>
  );
}

function IconCal() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="1.5" />
      <path d="M3 9 H21 M8 3 V7 M16 3 V7" />
    </svg>
  );
}
function IconJoin() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="6" width="13" height="12" rx="1.5" />
      <path d="M16 10 L 22 7 L 22 17 L 16 14" />
    </svg>
  );
}
function IconMic() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11 a7 7 0 0 0 14 0 M12 18 V22 M8 22 H16" />
    </svg>
  );
}
function IconBolt() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M13 2 L 4 14 H 11 L 10 22 L 20 10 H 13 Z" />
    </svg>
  );
}
