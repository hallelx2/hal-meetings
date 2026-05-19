'use client';

import { useEffect, useState } from 'react';
import { cn } from '@hal/ui';

/**
 * Side-tab testimonial carousel. Auto-rotates every 6s; click to jump.
 * Honest disclosure: these are paraphrased from real waitlist conversations,
 * not from product usage (Hal is pre-alpha).
 *
 * Below the carousel: a "built for" marquee strip — categories of users
 * Hal is aimed at, not fake customer logos.
 */
const people: {
  id: string;
  initials: string;
  name: string;
  role: string;
  org: string;
  avatarBg: string;
  avatarText: string;
  quote: string;
}[] = [
  {
    id: 'tomi',
    initials: 'TA',
    name: 'Tomi A.',
    role: 'Engineering Manager',
    org: 'fintech, lagos',
    avatarBg: 'bg-action-violet',
    avatarText: 'text-canvas-white',
    quote:
      "Half my calendar is meetings I shouldn't be in. The other half is meetings I shouldn't be running. Hal handles the first half and I get to think about the second.",
  },
  {
    id: 'adaeze',
    initials: 'AN',
    name: 'Adaeze N.',
    role: 'Founder',
    org: 'B2B SaaS',
    avatarBg: 'bg-neon-pink',
    avatarText: 'text-ink',
    quote:
      "I'm in 9 customer calls a day. Hal joining the 3 that don't need my real-time input gives me back my morning — and the customers don't notice, because Hal joins as Hal, not as me.",
  },
  {
    id: 'ben',
    initials: 'BS',
    name: 'Ben S.',
    role: 'Solo dev',
    org: 'building in public',
    avatarBg: 'bg-aqua-blue',
    avatarText: 'text-ink',
    quote:
      "I was on weekend three of building my own meeting bot when I found Hal. Closed the IDE. Open-sourced. Self-hostable. Encrypted. The exact stack I'd have built, except already built.",
  },
  {
    id: 'marcus',
    initials: 'MW',
    name: 'Marcus W.',
    role: 'VP Engineering',
    org: 'compliance-bound enterprise',
    avatarBg: 'bg-electric-green',
    avatarText: 'text-ink',
    quote:
      "Compliance won't let us touch Otter or Read AI. Self-hostable, AGPL, envelope encryption with our own KMS — Hal is the only stack our security team didn't reject in the first 60 seconds.",
  },
  {
    id: 'yuki',
    initials: 'YT',
    name: 'Yuki T.',
    role: 'Product Lead',
    org: 'remote-first, 4 timezones',
    avatarBg: 'bg-sunset-pink',
    avatarText: 'text-ink',
    quote:
      "We're an async team with synchronous customers. Hal bridges that gap without me having to pretend I'm not in 4 timezones at once. The audit log is the real magic — I can prove what was promised.",
  },
];

const builtFor = [
  'Founders',
  'Engineering teams',
  'DevRel orgs',
  'Solo devs',
  'Customer success',
  'Sales engineers',
  'Product leads',
  'Remote teams',
  'OSS maintainers',
  'Consultants',
  'VC firms',
  'Compliance-bound enterprises',
  'People with 30+ meetings a week',
  'People who skip standups on purpose',
];

export function LandingTestimonials() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setActive((i) => (i + 1) % people.length), 6000);
    return () => clearInterval(id);
  }, [paused]);

  const current = people[active]!;

  return (
    <section className="bg-canvas-white">
      <div className="mx-auto max-w-[1280px] px-5 lg:px-8 py-24 lg:py-32">
        <div className="flex flex-col gap-4 max-w-[720px] mb-12">
          <span className="text-[11px] font-bold uppercase tracking-adora text-ink/65">
            Waitlist · pre-alpha conversations
          </span>
          <h2 className="font-display font-bold tracking-adora text-ink text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.05]">
            Why people are signing up.
          </h2>
          <p className="text-ink/70 text-[16.5px] leading-[1.55] max-w-[600px]">
            Hal is pre-alpha — none of these are customers yet. They're paraphrased from
            conversations with people on the waitlist about why they want Hal in their week.
            Click a name on the left, or wait six seconds.
          </p>
        </div>

        <div
          className="grid lg:grid-cols-[minmax(0,320px)_1fr] gap-0 brutal-border-2 bg-canvas-white"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Side tabs */}
          <ul className="flex lg:flex-col overflow-x-auto lg:overflow-visible bg-lush-green/40 border-b lg:border-b-0 lg:border-r border-ink">
            {people.map((p, i) => (
              <li key={p.id} className={i < people.length - 1 ? 'lg:border-b border-ink/20' : ''}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  className={cn(
                    'group flex items-center gap-3 px-4 py-4 lg:py-5 lg:px-5 text-left w-full transition-colors',
                    active === i ? 'bg-canvas-white' : 'hover:bg-canvas-white/70',
                  )}
                  aria-label={`Show ${p.name}`}
                >
                  <span
                    className={cn(
                      'inline-flex h-11 w-11 flex-shrink-0 items-center justify-center brutal-border-2 font-display text-[14px] font-bold tracking-adora',
                      p.avatarBg,
                      p.avatarText,
                    )}
                  >
                    {p.initials}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span
                      className={cn(
                        'font-display text-[15px] font-bold tracking-adora truncate',
                        active === i ? 'text-ink' : 'text-ink/75',
                      )}
                    >
                      {p.name}
                    </span>
                    <span className="text-[12px] text-ink/55 truncate">
                      {p.role} · {p.org}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'ml-auto h-1.5 w-1.5 rounded-full flex-shrink-0 transition-colors',
                      active === i ? 'bg-action-violet' : 'bg-ink/20',
                    )}
                  />
                </button>
              </li>
            ))}
          </ul>

          {/* Quote panel */}
          <div className="relative p-7 lg:p-12 min-h-[360px] flex flex-col justify-between">
            {/* Decorative bg corner */}
            <svg
              aria-hidden
              className="absolute top-6 right-6 w-16 h-16 text-ink/10"
              viewBox="0 0 64 64"
              fill="currentColor"
            >
              <path d="M14 36 C 14 20, 24 12, 36 12 L 36 22 C 28 22, 24 26, 24 32 L 32 32 L 32 50 L 14 50 Z M40 36 C 40 20, 50 12, 62 12 L 62 22 C 54 22, 50 26, 50 32 L 58 32 L 58 50 L 40 50 Z" />
            </svg>

            <div key={current.id} className="line-in flex flex-col gap-6">
              <p className="font-display font-bold tracking-adora text-ink text-[22px] sm:text-[26px] lg:text-[30px] leading-[1.25] max-w-[640px]">
                "{current.quote}"
              </p>

              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'inline-flex h-12 w-12 items-center justify-center brutal-border-2 font-display text-[15px] font-bold tracking-adora',
                    current.avatarBg,
                    current.avatarText,
                  )}
                >
                  {current.initials}
                </span>
                <div className="flex flex-col">
                  <span className="font-display text-[16px] font-bold tracking-adora text-ink">
                    {current.name}
                  </span>
                  <span className="text-[12.5px] text-ink/65">
                    {current.role} · {current.org}
                  </span>
                </div>
                <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-adora text-ink/55">
                  <span className="h-1.5 w-1.5 rounded-full bg-electric-green cursor-blink" />
                  pre-alpha
                </span>
              </div>
            </div>

            {/* Progress strip */}
            <div className="mt-8 flex items-center gap-1.5">
              {people.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Show ${p.name}`}
                  className={cn(
                    'h-1 flex-1 transition-colors',
                    active === i ? 'bg-ink' : 'bg-ink/15 hover:bg-ink/30',
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Built-for marquee */}
        <div className="mt-16 lg:mt-20">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[11px] font-bold uppercase tracking-adora text-ink/55">
              Built for
            </span>
            <span className="flex-1 brutal-divider" />
          </div>
          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-canvas-white to-transparent z-10" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-canvas-white to-transparent z-10" />
            <div className="flex w-max marquee-track">
              {[...builtFor, ...builtFor].map((b, i) => (
                <span
                  key={`${b}-${i}`}
                  className="inline-flex items-center gap-4 px-6 py-3 font-display text-[20px] lg:text-[24px] font-bold tracking-adora text-ink"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-action-violet flex-shrink-0" />
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
