import { cn } from '@hal/ui';
import type { PeriodStats } from '@/module/dashboard/calendar';

/**
 * Hero numbers, not charts.
 *
 * This is count-and-label data: four figures with no series, no trend and no
 * comparison. A chart would add ink without adding meaning, so the number is
 * the visualisation and the label carries the rest.
 */
function Tile({
  value,
  label,
  hint,
  accent,
}: {
  value: string;
  label: string;
  hint?: string;
  accent?: 'lime' | 'gray';
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1 p-5 brutal-border-2',
        accent === 'lime' && 'bg-lush-green',
        accent === 'gray' && 'bg-soft-gray-fill',
      )}
    >
      <span className="font-display text-[38px] leading-[1] tabular-nums">{value}</span>
      <span className="text-[12px] font-bold uppercase tracking-adora text-ink/60">{label}</span>
      {hint ? <span className="text-[13px] leading-snug text-ink/55">{hint}</span> : null}
    </div>
  );
}

export function StatRow({ stats, periodName }: { stats: PeriodStats; periodName: string }) {
  return (
    <section aria-label={`Summary for ${periodName}`} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile value={String(stats.total)} label="Events" hint={periodName} />
      <Tile
        value={String(stats.joinable)}
        label="Hal can join"
        hint="Google Meet"
        accent="lime"
      />
      <Tile
        value={String(stats.unsupported)}
        label="Not yet supported"
        hint="Zoom · Teams"
        accent="gray"
      />
      <Tile value={`${stats.hours}`} label="Hours booked" hint="Timed events only" />
    </section>
  );
}
