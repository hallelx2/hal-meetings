'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function JoinMeetForm() {
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
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setBusy(false);
        if (!res.ok) {
          setMessage(
            data.error === 'invalid_meet_url'
              ? 'Use a https://meet.google.com/xxx-yyyy-zzz link.'
              : 'Could not enqueue the join.',
          );
          return;
        }
        setUrl('');
        setMessage('Hal is joining. Admit the guest named Hal in the Meet lobby.');
        router.refresh();
      }}
    >
      <label className="text-[12px] font-bold uppercase tracking-adora text-ink/50" htmlFor="meet-url">
        Meet URL
      </label>
      <input
        id="meet-url"
        type="url"
        required
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="https://meet.google.com/abc-defg-hij"
        className="h-12 px-3 brutal-border bg-canvas-white text-[15px] outline-none focus:bg-lush-green/20"
      />
      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-12 items-center justify-center px-6 bg-ink text-canvas-white text-[14px] font-bold uppercase tracking-adora hover:bg-ink-soft disabled:opacity-60"
      >
        {busy ? 'Sending Hal…' : 'Join this Meet'}
      </button>
      {message ? <p className="text-[14px] text-ink/70">{message}</p> : null}
    </form>
  );
}
