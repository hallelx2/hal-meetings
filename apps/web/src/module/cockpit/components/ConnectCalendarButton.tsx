'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { CALENDAR_SCOPES, IDENTITY_SCOPES } from '@/lib/google-scopes';

/**
 * Incremental authorisation for Calendar.
 *
 * Better Auth's `linkSocial` refuses an already-linked provider, and by this
 * point Google is always already linked — signing in is what linked it. So the
 * upgrade runs through `signIn.social` with an explicit scope override instead:
 * same provider, same account, wider grant.
 *
 * Identity scopes are re-sent alongside the calendar ones rather than relying
 * on Google's `include_granted_scopes` to carry them, so the resulting token
 * covers the full set no matter how that flag behaves.
 *
 * `prompt=consent` is forced here, and only here: Google withholds a refresh
 * token when re-approving a grant it has already given, and without one the
 * calendar sync dies the first time the access token expires.
 */
export function ConnectCalendarButton({
  next = '/dashboard',
  variant = 'primary',
  label = 'Connect Google Calendar',
}: {
  next?: string;
  variant?: 'primary' | 'secondary';
  label?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base =
    'inline-flex h-11 items-center px-5 text-[13px] font-bold uppercase tracking-adora transition-colors disabled:opacity-60';
  const skin =
    variant === 'primary'
      ? 'bg-ink text-canvas-white hover:bg-ink-soft'
      : 'brutal-border text-ink hover:bg-lush-green';

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setPending(true);
          setError(null);
          void authClient.signIn
            .social({
              provider: 'google',
              scopes: [...IDENTITY_SCOPES, ...CALENDAR_SCOPES],
              additionalParams: { prompt: 'consent', access_type: 'offline' },
              callbackURL: next,
              errorCallbackURL: next,
            })
            .catch(() => {
              setError('Could not start the Google Calendar connection. Try again.');
              setPending(false);
            });
        }}
        className={`${base} ${skin}`}
      >
        {pending ? 'Redirecting…' : label}
      </button>
      {error ? <p className="text-[14px] text-ink/70">{error}</p> : null}
    </div>
  );
}
