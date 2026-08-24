'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Keeps a running meeting's page current, and stops when the meeting does.
 *
 * A server component with `router.refresh()` rather than a client cache: the
 * page already renders from the database on the server, so re-running that is
 * the whole update. No second data path, no React Query, no websocket to keep
 * alive for a screen someone watches for twenty minutes.
 *
 * It stops polling the moment the meeting reaches a terminal state. A finished
 * meeting is immutable, and a tab left open on one should not keep a database
 * connection busy overnight.
 */
export function LiveRefresh({
  finished,
  intervalMs = 5_000,
}: {
  finished: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();
  const [pausedByHiddenTab, setPaused] = useState(false);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    setPaused(document.hidden);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (finished || pausedByHiddenTab) return;
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [finished, pausedByHiddenTab, intervalMs, router]);

  if (finished) return null;

  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-adora text-ink/45">
      <span
        aria-hidden
        className="inline-block h-2 w-2 animate-pulse bg-air-blue brutal-border"
      />
      {pausedByHiddenTab ? 'paused' : 'live'}
    </span>
  );
}
