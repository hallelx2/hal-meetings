'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * @param botName exactly what Hal will be called in the participant list.
 * Passed in rather than hardcoded so the instruction on screen names the same
 * guest the agent actually types into the join form. If those two drift, the
 * user is told to admit somebody who never appears — and an unexplained bot in
 * the lobby is one a host is right to decline.
 */
export function JoinMeetForm({ botName }: { botName: string }) {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setMessage(null);
        const res = await fetch('/api/meetings/join', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          meetingId?: string;
        };
        setBusy(false);
        if (!res.ok) {
          setMessage(
            data.error === 'invalid_meet_url'
              ? 'Use a Meet link (meet.google.com/xxx-yyyy-zzz) or a Zoom link (zoom.us/j/…).'
              : 'Could not enqueue the join.',
          );
          return;
        }
        setUrl('');
        // Straight to the page for this meeting. Everything that happens next —
        // the lobby, the disclosure, the transcript, a failure and its reason —
        // is visible there instead of in a container log.
        if (data.meetingId) {
          router.push(`/meetings/${data.meetingId}`);
          return;
        }
        setMessage(`Hal is joining. Let “${botName}” in when it asks — it waits ten minutes.`);
        router.refresh();
      }}
    >
      <label className="text-[12px] font-bold uppercase tracking-adora text-ink/50" htmlFor="meet-url">
        Meeting URL
      </label>
      <input
        id="meet-url"
        type="url"
        required
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="https://meet.google.com/abc-defg-hij or https://zoom.us/j/…"
        className="h-12 px-3 brutal-border bg-canvas-white text-[15px] outline-none focus:bg-lush-green/20"
      />
      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-12 items-center justify-center px-6 bg-ink text-canvas-white text-[14px] font-bold uppercase tracking-adora hover:bg-ink-soft disabled:opacity-60"
      >
        {busy ? 'Sending Hal…' : 'Send Hal to this meeting'}
      </button>
      {message ? <p className="text-[14px] text-ink/70">{message}</p> : null}
    </form>
  );
}
