'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';

export function GoogleSignInButton({ next = '/app' }: { next?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setPending(true);
          setError(null);
          void authClient.signIn
            .social({ provider: 'google', callbackURL: next })
            .catch(() => {
              setError('Google sign-in failed. Try again.');
              setPending(false);
            });
        }}
        className="inline-flex h-12 items-center justify-center px-6 bg-ink text-canvas-white text-[14px] font-bold uppercase tracking-adora hover:bg-ink-soft disabled:opacity-60"
      >
        {pending ? 'Redirecting…' : 'Continue with Google'}
      </button>
      {error ? <p className="text-[14px] text-ink/70">{error}</p> : null}
    </div>
  );
}
