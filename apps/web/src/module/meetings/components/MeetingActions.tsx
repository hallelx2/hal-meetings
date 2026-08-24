'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Send Hal back into a meeting it left, failed on, or was never sent to.
 *
 * Rejoining is the whole reason this button exists: every failure this week
 * ended with a job that could only be retried by pasting the URL again from
 * the dashboard, which meant knowing the URL and knowing that retrying was even
 * possible. The meeting already knows its own link.
 */
export function MeetingActions({
  meetingId,
  url,
  canRejoin,
}: {
  meetingId: string;
  url: string | null;
  canRejoin: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!url) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {canRejoin ? (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setMessage(null);
              const res = await fetch('/api/meetings/join', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ url, meetingId }),
              }).catch(() => null);
              setBusy(false);

              if (!res?.ok) {
                setMessage('Could not queue the join. Nothing has changed.');
                return;
              }
              setMessage('Queued. Let Hal in when it asks.');
              router.refresh();
            }}
            className="inline-flex h-11 items-center justify-center whitespace-nowrap bg-ink px-5 text-[13px] font-bold uppercase tracking-adora text-canvas-white transition-colors hover:bg-ink-soft disabled:opacity-60"
          >
            {busy ? 'Sending Hal…' : 'Send Hal again'}
          </button>
        ) : null}

        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center whitespace-nowrap px-4 text-[12px] font-bold uppercase tracking-adora brutal-border hover:bg-lush-green"
        >
          Open the meeting
        </a>
      </div>

      {/* The confirmation carries an instruction, so it stays put rather than
          flashing past as a toast. */}
      {message ? <p className="text-[13px] leading-relaxed text-ink/75">{message}</p> : null}
    </div>
  );
}
