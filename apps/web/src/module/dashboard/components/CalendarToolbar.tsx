import Link from 'next/link';
import { cn } from '@hal/ui';
import { addDays, addMonths, startOfWeek, type CalendarView } from '@/module/dashboard/calendar';

function href(anchor: Date, view: CalendarView): string {
  const params = new URLSearchParams({
    view,
    // Date only. A timestamp would make every navigation a distinct URL and
    // defeat any caching, for no gain — the grid is a whole-day thing.
    on: `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}-${String(
      anchor.getDate(),
    ).padStart(2, '0')}`,
  });
  return `/dashboard?${params.toString()}`;
}

const CONTROL =
  'inline-flex h-10 items-center justify-center whitespace-nowrap px-4 text-[12px] font-bold uppercase tracking-adora transition-colors';

/**
 * Period navigation and the view switch.
 *
 * Plain links carrying state in the URL, so the dashboard stays a server
 * component: no client-side date state, and a given month is a shareable,
 * reloadable address.
 */
export function CalendarToolbar({
  anchor,
  view,
  label,
  today,
}: {
  anchor: Date;
  view: CalendarView;
  label: string;
  today: Date;
}) {
  const step = view === 'month' ? 1 : 7;
  const previous = view === 'month' ? addMonths(anchor, -step) : addDays(startOfWeek(anchor), -step);
  const next = view === 'month' ? addMonths(anchor, step) : addDays(startOfWeek(anchor), step);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex">
          <Link href={href(previous, view)} aria-label="Previous period" className={cn(CONTROL, 'brutal-border hover:bg-lush-green')}>
            ←
          </Link>
          <Link
            href={href(next, view)}
            aria-label="Next period"
            className={cn(CONTROL, 'brutal-border border-l-0 hover:bg-lush-green')}
          >
            →
          </Link>
        </div>
        <Link href={href(today, view)} className={cn(CONTROL, 'brutal-border hover:bg-lush-green')}>
          Today
        </Link>
        <h2 className="ml-1 min-w-0 truncate text-[20px] leading-none md:text-[24px]">{label}</h2>
      </div>

      <div className="flex" role="group" aria-label="Calendar view">
        {(['month', 'week'] as const).map((option, index) => (
          <Link
            key={option}
            href={href(anchor, option)}
            aria-current={view === option ? 'true' : undefined}
            className={cn(
              CONTROL,
              'brutal-border',
              index > 0 && 'border-l-0',
              view === option ? 'bg-ink text-canvas-white' : 'hover:bg-lush-green',
            )}
          >
            {option}
          </Link>
        ))}
      </div>
    </div>
  );
}
