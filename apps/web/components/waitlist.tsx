'use client';

import { useState } from 'react';
import { Button, Badge } from '@hal/ui';

export function Waitlist() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'ok' | 'err'>('idle');

  return (
    <section id="waitlist" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="mx-auto max-w-[1240px] px-6 lg:px-10">
        <div className="relative rounded-[64px] bg-rich-violet text-canvas-white overflow-hidden p-10 lg:p-20">
          {/* decorative spots */}
          <div className="absolute -top-24 -left-16 h-64 w-64 rounded-full bg-action-violet/60 blur-3xl" aria-hidden />
          <div className="absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-neon-pink/35 blur-3xl" aria-hidden />
          <div className="absolute top-8 right-8 h-2 w-2 rounded-full bg-electric-green cursor-blink" aria-hidden />

          <div className="relative grid lg:grid-cols-[1.1fr_1fr] gap-10 items-center">
            <div className="flex flex-col gap-5">
              <Badge tone="electric" dot>
                Pre-alpha · invite-only
              </Badge>
              <h2 className="font-display font-bold tracking-adora text-canvas-white text-[36px] lg:text-[56px] leading-[1.05]">
                Send Hal to your next meeting.
              </h2>
              <p className="text-canvas-white/80 text-[18px] leading-[1.55] max-w-[480px]">
                We're rolling out access in small batches. Drop your email and we'll send a setup
                link when Hal can join a meeting in your stack.
              </p>
            </div>

            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!email || !email.includes('@')) {
                  setStatus('err');
                  return;
                }
                setStatus('submitting');
                // Optimistic local-only — wire to a real endpoint later.
                setTimeout(() => setStatus('ok'), 600);
              }}
            >
              <label htmlFor="email" className="text-[13px] font-semibold uppercase tracking-adora text-canvas-white/60">
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
                  className="flex-1 h-14 rounded-buttons bg-canvas-white/10 border border-canvas-white/15 px-5 text-[16px] text-canvas-white placeholder:text-canvas-white/40 focus:outline-none focus:border-canvas-white/40 transition-colors tracking-adora"
                />
                <Button type="submit" variant="primary" size="lg" disabled={status === 'submitting'}>
                  {status === 'submitting' ? 'Sending…' : status === 'ok' ? 'You\'re in ✓' : 'Request access'}
                </Button>
              </div>
              <p className="text-[13px] text-canvas-white/55 leading-[1.5]">
                We'll only email you about Hal access. No newsletter, no tracking pixels.
              </p>
              {status === 'err' && (
                <p className="text-[13px] text-neon-pink">Please use a valid email address.</p>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
