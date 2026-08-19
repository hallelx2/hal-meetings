'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';

export function SessionActions({ googleConnected }: { googleConnected: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'out' | 'disconnect' | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {googleConnected ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={async () => {
              setBusy('disconnect');
              setError(null);
              const res = await fetch('/api/auth/google/disconnect', { method: 'POST' });
              if (!res.ok) setError('Could not disconnect Google.');
              setBusy(null);
              router.refresh();
            }}
            className="inline-flex h-11 items-center px-5 brutal-border text-[13px] font-bold uppercase tracking-adora hover:bg-lush-green disabled:opacity-60"
          >
            {busy === 'disconnect' ? 'Disconnecting…' : 'Disconnect Google'}
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy !== null}
          onClick={async () => {
            setBusy('out');
            await authClient.signOut();
            router.replace('/login');
            router.refresh();
          }}
          className="inline-flex h-11 items-center px-5 bg-ink text-canvas-white text-[13px] font-bold uppercase tracking-adora hover:bg-ink-soft disabled:opacity-60"
        >
          {busy === 'out' ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
      {error ? <p className="text-[14px] text-ink/70">{error}</p> : null}
    </div>
  );
}
