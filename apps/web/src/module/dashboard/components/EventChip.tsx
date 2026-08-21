import { cn } from '@hal/ui';
import { isLive, type CalendarEntry } from '@/module/dashboard/calendar';

function time(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * One event in a day cell.
 *
 * The fill carries the state at a glance; the badge carries the same state in
 * words. Colour is never the only encoding — it fails for colourblind readers,
 * in print, and under forced-colors, and this grid's entire job is telling
 * joinable meetings apart from the rest.
 */
export function EventChip({
  entry,
  now,
  dense = false,
}: {
  entry: CalendarEntry;
  now: Date;
  dense?: boolean;
}) {
  const live = isLive(entry, now);

  const badge = live
    ? 'Live'
    : entry.joinable
      ? 'Meet'
      : entry.platform
        ? `${entry.platform} · not yet`
        : null;

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-0.5 px-2 py-1.5 brutal-border',
        live
          ? 'bg-air-blue'
          : entry.joinable
            ? 'bg-lush-green'
            : entry.platform
              ? 'bg-soft-gray-fill'
              : 'bg-canvas-white',
      )}
    >
      <div className="flex items-baseline gap-1.5">
        <span className="shrink-0 font-mono-grit text-[11px] font-bold tabular-nums text-ink/70">
          {time(entry.start)}
        </span>
        <span className={cn('min-w-0 truncate text-[12px] font-semibold text-ink', dense && 'text-[11px]')}>
          {entry.title}
        </span>
      </div>
      {badge ? (
        <span className="w-fit whitespace-nowrap text-[10px] font-bold uppercase tracking-adora text-ink/70">
          {badge}
        </span>
      ) : null}
    </div>
  );
}

/**
 * The legend. Present because identity must never be colour-alone — with four
 * fills in play, the key is what makes the grid readable rather than decorative.
 */
export function CalendarLegend() {
  const items = [
    { fill: 'bg-lush-green', label: 'Hal can join' },
    { fill: 'bg-air-blue', label: 'Live now' },
    { fill: 'bg-soft-gray-fill', label: 'Not yet supported' },
    { fill: 'bg-canvas-white', label: 'No meeting link' },
  ];

  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span className={cn('h-3 w-3 shrink-0 brutal-border', item.fill)} aria-hidden />
          <span className="whitespace-nowrap text-[12px] font-bold uppercase tracking-adora text-ink/55">
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
