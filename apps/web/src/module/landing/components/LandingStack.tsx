'use client';

import { useEffect, useState } from 'react';
import { cn } from '@hal/ui';

/**
 * Inclined / telescoping stack of cards depicting one day in your calendar,
 * handled by Hal. Auto-cycles the front card every 4.5s; on hover, the stack
 * telescopes outward so you can see all of them at once.
 */
type Mode = 'skipped' | 'delegate' | 'listen' | 'ignored';

const cards: {
  id: string;
  time: string;
  title: string;
  mode: Mode;
  modeLabel: string;
  body: string;
  quote: string;
  bg: string;
  text: string;
}[] = [
  {
    id: 'standup',
    time: '09:00',
    title: 'Engineering standup',
    mode: 'skipped',
    modeLabel: 'Skipped · summary emailed',
    body: "You didn't go. Hal listened, took notes, emailed you a 90-second summary at 09:13. Your team didn't notice you weren't there.",
    quote: "Hal: '3 PRs merged, infra deploy at noon, no blockers raised.'",
    bg: 'bg-lush-green',
    text: 'text-ink',
  },
  {
    id: 'customer',
    time: '11:00',
    title: 'Customer success call · Acme',
    mode: 'delegate',
    modeLabel: 'Joined as delegate · spoke for you',
    body: 'You were on a flight. Hal joined as a disclosed delegate, walked Acme through the v2 changes, and committed to a follow-up — for your review.',
    quote: "Hal: 'I'll send Halleluyah the spec by Friday and CC you on the reply.'",
    bg: 'bg-action-violet',
    text: 'text-canvas-white',
  },
  {
    id: 'investor',
    time: '14:30',
    title: 'Investor update · monthly',
    mode: 'listen',
    modeLabel: 'Listen-only · chatted clarifications',
    body: "You attended. Hal sat quietly, transcribed, and surfaced one question in chat when ARR slide looked off — saved you 5 minutes of post-meeting follow-up.",
    quote: "Hal (in chat): 'Slide 8 ARR figure is YoY — should it be MRR-based per last month's deck?'",
    bg: 'bg-sunset-pink',
    text: 'text-ink',
  },
  {
    id: 'design',
    time: '16:30',
    title: 'Design review · auth flow',
    mode: 'ignored',
    modeLabel: 'Ignored by policy · slack monitored',
    body: "Per your per-meeting policy, Hal didn't even join. Instead, it monitored the #design-auth Slack thread and posted a digest at 17:30.",
    quote: "Hal: 'No decisions. Two open Qs flagged for tomorrow. No follow-up needed from you.'",
    bg: 'bg-aqua-blue',
    text: 'text-ink',
  },
];

const modeBadge: Record<Mode, string> = {
  skipped: 'bg-canvas-white text-ink',
  delegate: 'bg-electric-green text-ink',
  listen: 'bg-canvas-white text-ink',
  ignored: 'bg-ink text-canvas-white',
};

export function LandingStack() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setActive((i) => (i + 1) % cards.length);
    }, 4500);
    return () => clearInterval(id);
  }, [paused]);

  // Each card's distance from the front, 0 = on top.
  const offsetFor = (i: number) => (i - active + cards.length) % cards.length;

  return (
    <section className="bg-lush-green">
      <div className="mx-auto max-w-[1280px] px-5 lg:px-8 py-24 lg:py-32">
        <div className="grid lg:grid-cols-[1fr_1.15fr] gap-12 lg:gap-16 items-center">
          {/* Left — copy */}
          <div className="flex flex-col gap-5">
            <span className="text-[11px] font-bold uppercase tracking-adora text-ink/65">
              A day in the queue
            </span>
            <h2 className="font-display font-bold tracking-adora text-ink text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.05]">
              Hal in your week.
              <br />
              <span className="text-ink/65">Four meetings, four modes.</span>
            </h2>
            <p className="text-ink/80 text-[16.5px] leading-[1.6] max-w-[460px]">
              Some meetings need you. Some need a summary. Some need someone to speak on your
              behalf. Some shouldn't happen at all. Hal sorts the difference, on a per-meeting
              policy you set.
            </p>

            {/* Tab strip — also lets you jump to a card */}
            <div className="mt-3 flex flex-col">
              {cards.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActive(i)}
                  onMouseEnter={() => setPaused(true)}
                  onMouseLeave={() => setPaused(false)}
                  className={cn(
                    'group grid grid-cols-[52px_1fr_auto] items-center gap-4 py-3.5 border-t border-ink/15 first:border-t-0 text-left transition-colors',
                    active === i ? 'text-ink' : 'text-ink/55 hover:text-ink/80',
                  )}
                  aria-label={`Show ${c.title}`}
                >
                  <span
                    className={cn(
                      'inline-flex items-center justify-center h-6 px-1.5 brutal-border text-[10px] font-bold uppercase tracking-adora transition-colors',
                      active === i ? 'bg-ink text-canvas-white' : 'bg-canvas-white text-ink',
                    )}
                  >
                    {c.time}
                  </span>
                  <span className="text-[14.5px] font-semibold leading-[1.3]">{c.title}</span>
                  <span
                    className={cn(
                      'text-[10px] font-bold uppercase tracking-adora transition-opacity',
                      active === i ? 'opacity-100' : 'opacity-0 group-hover:opacity-60',
                    )}
                  >
                    →
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right — telescoping stack */}
          <div
            className="relative h-[460px] sm:h-[440px] lg:h-[420px] [perspective:1400px]"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div className="stack-deck group relative h-full w-full">
              {cards.map((c, i) => {
                const off = offsetFor(i);
                return (
                  <article
                    key={c.id}
                    aria-hidden={off !== 0}
                    className={cn(
                      'absolute inset-x-0 top-0 mx-auto w-[92%] sm:w-[460px] h-[360px] brutal-border-2 p-6 lg:p-7 transition-all duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)] origin-bottom-left will-change-transform',
                      c.bg,
                      c.text,
                    )}
                    style={{
                      transform: `translate3d(${off * 24}px, ${off * -14}px, 0) rotate(${off * 2.4}deg)`,
                      zIndex: cards.length - off,
                      opacity: off >= cards.length - 1 ? 0 : 1 - off * 0.12,
                      pointerEvents: off === 0 ? 'auto' : 'none',
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-bold uppercase tracking-adora opacity-70">
                          {c.time}
                        </span>
                        <h3 className="font-display text-[20px] lg:text-[22px] font-bold tracking-adora leading-[1.15]">
                          {c.title}
                        </h3>
                      </div>
                      <span
                        className={cn(
                          'inline-flex h-7 items-center px-2.5 brutal-border text-[10px] font-bold uppercase tracking-adora flex-shrink-0',
                          modeBadge[c.mode],
                        )}
                      >
                        {c.mode}
                      </span>
                    </div>

                    <p className="mt-5 text-[14.5px] leading-[1.55] opacity-90 max-w-[340px]">
                      {c.body}
                    </p>

                    <div className="absolute left-6 right-6 lg:left-7 lg:right-7 bottom-6">
                      <div className="text-[10px] font-bold uppercase tracking-adora opacity-65 mb-2">
                        {c.modeLabel}
                      </div>
                      <div className="brutal-border bg-canvas-white text-ink p-3 text-[12.5px] leading-[1.5]">
                        "{c.quote}"
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Telescope hint */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-adora text-ink/55">
              <span className="h-1.5 w-1.5 rounded-full bg-electric-green cursor-blink" />
              auto-cycling · hover to pause
            </div>
          </div>
        </div>
      </div>

      {/* Telescope-on-hover CSS — fans the stack out when hovering the deck */}
      <style>{`
        .stack-deck:hover > article {
          transition-duration: 480ms !important;
        }
        .stack-deck:hover > article:nth-child(1) { transform: translate3d(-90px, -10px, 0) rotate(-6deg) !important; }
        .stack-deck:hover > article:nth-child(2) { transform: translate3d(-30px, -10px, 0) rotate(-2deg) !important; }
        .stack-deck:hover > article:nth-child(3) { transform: translate3d(30px, -10px, 0) rotate(2deg) !important; }
        .stack-deck:hover > article:nth-child(4) { transform: translate3d(90px, -10px, 0) rotate(6deg) !important; }
        .stack-deck:hover > article { opacity: 1 !important; }
      `}</style>
    </section>
  );
}
