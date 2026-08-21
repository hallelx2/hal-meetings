import { Badge } from '@hal/ui';

/**
 * Whether Calendar is connected, visible from every authenticated screen.
 *
 * Deliberately not a prompt. Nagging belongs to the dashboard, once (HAL-831);
 * the chrome only ever states the fact, so a user who has already declined is
 * not asked again on every screen they visit.
 */
export function CalendarStatusChip({
  connected,
  compact = false,
}: {
  connected: boolean;
  compact?: boolean;
}) {
  const label = connected ? 'Calendar on' : 'Calendar off';

  return (
    <Badge
      tone={connected ? 'electric' : 'neon'}
      dot
      className={compact ? 'shrink-0 px-2 py-0.5 text-[11px]' : 'self-start'}
    >
      {compact ? label : `Google ${label.toLowerCase()}`}
    </Badge>
  );
}
