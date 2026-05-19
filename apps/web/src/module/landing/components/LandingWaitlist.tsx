'use client';

import { useState } from 'react';

export function LandingWaitlist() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'ok' | 'err'>('idle');

  return (
    <section id="waitlist" className="bg-ink text-canvas-white">
      <div className="mx-auto max-w-[1280px] px-5 lg:px-8 py-24 lg:py-32">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
          <div className="flex flex-col gap-5">
            <span className="text-[11px] font-bold uppercase tracking-adora text-electric-green">
              Pre-alpha · invite-only
            </span>
            <h2 className="font-display font-bold tracking-adora text-canvas-white text-[40px] sm:text-[52px] lg:text-[64px] leading-[1.02]">
              Send Hal to your <br />
              next meeting.
            </h2>
            <p className="text-canvas-white/70 text-[17px] leading-[1.55] max-w-[460px]">
              We're rolling out access in small batches. Drop your email and we'll send a
              setup link when Hal can join a meeting in your stack.
            </p>
          </div>

          <form
            className="flex flex-col gap-3 max-w-[480px] w-full"
            onSubmit={(e) => {
              e.preventDefault();
              if (!email || !email.includes('@')) {
                setStatus('err');
                return;
              }
              setStatus('submitting');
              setTimeout(() => setStatus('ok'), 600);
            }}
          >
            <label
              htmlFor="email"
              className="text-[11px] font-bold uppercase tracking-adora text-canvas-white/60"
            >
              Work email
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@team.com"
                className="flex-1 h-13 px-5 brutal-border-2 border-canvas-white bg-canvas-white text-ink text-[15px] placeholder:text-ink/40 focus:outline-none focus:border-electric-green tracking-adora"
              />
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="h-13 px-6 brutal-border-2 border-canvas-white bg-electric-green text-ink text-[13px] font-bold uppercase tracking-adora hover:bg-canvas-white disabled:opacity-50 transition-colors"
              >
                {status === 'submitting' ? 'Sending…' : status === 'ok' ? "You're in ✓" : 'Get early access'}
              </button>
            </div>
            <p className="text-[12px] text-canvas-white/45 tracking-adora">
              We'll only email about Hal access. No newsletter, no tracking pixels.
            </p>
            {status === 'err' && (
              <p className="text-[12px] text-neon-pink font-medium">Please use a valid email address.</p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
