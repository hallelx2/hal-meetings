import { Badge } from '@hal/ui';
import type { CalendarConnection } from '@/lib/google-scopes';

const LABELS: Record<CalendarConnection, { long: string; short: string; tone: 'electric' | 'neon' }> = {
  connected: { long: 'Google calendar on', short: 'Calendar on', tone: 'electric' },
  // Not "on". The grant exists but cannot be renewed, so every sync fails —
  // saying "on" here is what made the sidebar contradict the page beside it.
  'needs-reconnect': { long: 'Calendar needs reconnect', short: 'Reconnect', tone: 'neon' },
  'not-connected': { long: 'Google calendar off', short: 'Calendar off', tone: 'neon' },
};

/**
 * Whether Calendar is connected, visible from every authenticated screen.
 *
 * Deliberately not a prompt. Nagging belongs to the dashboard, once (HAL-831);
 * the chrome only ever states the fact, so a user who has already declined is
 * not asked again on every screen they visit.
 */
export function CalendarStatusChip({
  state,
  compact = false,
}: {
  state: CalendarConnection;
  compact?: boolean;
}) {
  const label = LABELS[state];

  return (
    <Badge
      tone={label.tone}
      dot
      className={compact ? 'shrink-0 px-2 py-0.5 text-[11px]' : 'self-start'}
    >
      {compact ? label.short : label.long}
    </Badge>
  );
}
