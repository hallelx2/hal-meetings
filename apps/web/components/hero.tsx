import { Badge, LinkButton } from '@hal/ui';
import { MeetingCard } from './meeting-card';

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Background grid + drifting pastel orbs */}
      <div className="absolute inset-0 canvas-grid -z-10" aria-hidden />
      <div
        className="absolute -z-10 -top-24 -left-32 h-[420px] w-[420px] rounded-full bg-air-blue/70 blur-[60px] drift-slow"
        aria-hidden
      />
      <div
        className="absolute -z-10 top-48 -right-32 h-[380px] w-[380px] rounded-full bg-sunset-pink/60 blur-[60px] drift-slower"
        aria-hidden
      />
      <div
        className="absolute -z-10 top-[640px] left-1/2 -translate-x-1/2 h-[300px] w-[680px] rounded-full bg-lush-green/50 blur-[70px] drift-slow"
        aria-hidden
      />

      <div className="mx-auto max-w-[1240px] px-6 lg:px-10 pt-20 lg:pt-28 pb-24 lg:pb-32">
        <div className="flex flex-col items-center text-center gap-6 lg:gap-7 max-w-[920px] mx-auto">
          <Badge tone="violet" dot>
            Open source · self-hostable · pre-alpha
          </Badge>

          <h1 className="font-display font-bold tracking-adora text-rich-violet text-[44px] sm:text-[58px] lg:text-[78px] leading-[1.02]">
            Send <span className="text-action-violet">Hal</span>.
            <br />
            Skip the meeting.
          </h1>

          <p className="text-slate-text/80 text-[18px] lg:text-[20px] leading-[1.55] max-w-[620px]">
            Hal is an autonomous meeting agent that joins{' '}
            <span className="text-rich-violet font-semibold">Google Meet, Zoom, and Microsoft Teams</span>{' '}
            on your behalf — listens, takes notes, speaks when you want it to, and follows up after.
            Your tokens. Your transcripts. Your infra.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <LinkButton href="#waitlist" variant="primary" size="lg">
              Join the waitlist
            </LinkButton>
            <LinkButton href="#self-host" variant="ghost" size="lg">
              Self-host the agent →
            </LinkButton>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-slate-text/60 font-medium">
            <span className="inline-flex items-center gap-1.5">
              <Dot tone="electric" />
              AES-256 envelope encryption
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Dot tone="aqua" />
              BYO STT, TTS, LLM
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Dot tone="violet" />
              Bot-as-delegate, never deepfake
            </span>
          </div>
        </div>

        {/* Live-meeting showcase */}
        <div className="mt-16 lg:mt-20 relative">
          <MeetingCard />
          {/* Decorative spark behind the card */}
          <svg
            className="absolute -top-6 -left-6 w-12 h-12 text-action-violet opacity-80 hidden lg:block"
            viewBox="0 0 48 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M24 4 v16 M24 28 v16 M4 24 h16 M28 24 h16" strokeLinecap="round" />
          </svg>
          <svg
            className="absolute -bottom-4 -right-4 w-16 h-16 text-electric-green opacity-90 hidden lg:block"
            viewBox="0 0 64 64"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden
          >
            <circle cx="32" cy="32" r="20" />
            <circle cx="32" cy="32" r="8" fill="currentColor" stroke="none" />
          </svg>
        </div>
      </div>
    </section>
  );
}

function Dot({ tone }: { tone: 'electric' | 'aqua' | 'violet' }) {
  const cls = {
    electric: 'bg-electric-green',
    aqua: 'bg-aqua-blue',
    violet: 'bg-action-violet',
  }[tone];
  return <span className={`h-1.5 w-1.5 rounded-full ${cls}`} />;
}
