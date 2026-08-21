import { cn } from '@hal/ui';
import { DAY_NAMES, type CalendarView, type DayCell } from '@/module/dashboard/calendar';
import { EventChip } from '@/module/dashboard/components/EventChip';

/** How many chips a month cell shows before collapsing the rest into a count. */
const MONTH_CELL_LIMIT = 3;

function DayNumber({ cell, view }: { cell: DayCell; view: CalendarView }) {
  return (
    <div className="flex items-baseline justify-between gap-1">
      {view === 'week' ? (
        <span className="text-[11px] font-bold uppercase tracking-adora text-ink/55">
          {DAY_NAMES[(cell.date.getDay() + 6) % 7]}
        </span>
      ) : null}
      <span
        className={cn(
          'ml-auto font-mono-grit text-[13px] font-bold tabular-nums',
          cell.isToday
            ? 'flex h-6 w-6 items-center justify-center bg-ink text-canvas-white'
            : cell.inPeriod
              ? 'text-ink/70'
              : 'text-ink/30',
        )}
      >
        {cell.date.getDate()}
      </span>
    </div>
  );
}

/**
 * The calendar itself — a month or a week, on a desktop grid and as an agenda
 * on narrow screens.
 *
 * Two renderings of one dataset rather than one squashed. Seven columns on a
 * phone is unreadable, and a horizontal scroller hides half the period behind a
 * gesture nobody discovers.
 */
export function CalendarGrid({
  cells,
  view,
  now,
}: {
  cells: DayCell[];
  view: CalendarView;
  now: Date;
}) {
  const withEntries = cells.filter((cell) => cell.entries.length > 0);

  return (
    <>
      <div className="hidden lg:block brutal-border-2">
        {/* Weekday header, so the columns are legible before any event is read. */}
        <div className="grid grid-cols-7 border-b-[1.5px] border-ink/20">
          {DAY_NAMES.map((day) => (
            <div
              key={day}
              className="px-3 py-2 text-[11px] font-bold uppercase tracking-adora text-ink/50"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((cell, index) => {
            const overflow = view === 'month' ? cell.entries.length - MONTH_CELL_LIMIT : 0;
            const shown = view === 'month' ? cell.entries.slice(0, MONTH_CELL_LIMIT) : cell.entries;

            return (
              <div
                key={cell.date.toISOString()}
                className={cn(
                  'flex min-w-0 flex-col gap-1.5 p-2',
                  view === 'month' ? 'min-h-[124px]' : 'min-h-[260px]',
                  index % 7 !== 6 && 'border-r-[1.5px] border-ink/15',
                  index < cells.length - 7 && 'border-b-[1.5px] border-ink/15',
                  // Recessive, not hidden: events on these days are real and the
                  // user expects to see them.
                  !cell.inPeriod && 'bg-soft-gray-fill/40',
                  cell.isToday && 'bg-lush-green/20',
                )}
              >
                <DayNumber cell={cell} view={view} />
                <div className="flex flex-col gap-1">
                  {shown.map((entry) => (
                    <EventChip key={entry.id} entry={entry} now={now} dense={view === 'month'} />
                  ))}
                  {overflow > 0 ? (
                    <span className="px-1 text-[11px] font-bold uppercase tracking-adora text-ink/50">
                      +{overflow} more
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Narrow screens: an agenda of the days that actually have something on. */}
      <div className="flex flex-col gap-5 lg:hidden">
        {withEntries.length === 0 ? (
          <p className="p-5 text-[15px] text-ink/60 brutal-border-2">
            Nothing scheduled in this period.
          </p>
        ) : (
          withEntries.map((cell) => (
            <div key={cell.date.toISOString()} className="flex flex-col gap-2">
              {/* Out-of-period days are marked here too, not only on the desktop
                  grid. They are visible in the agenda but excluded from the stat
                  row, and an unexplained mismatch between the two reads as a
                  bug rather than as a deliberate boundary. */}
              <p
                className={cn(
                  'text-[12px] font-bold uppercase tracking-adora',
                  cell.isToday ? 'text-ink' : cell.inPeriod ? 'text-ink/50' : 'text-ink/35',
                )}
              >
                {DAY_NAMES[(cell.date.getDay() + 6) % 7]} {cell.date.getDate()}{' '}
                {cell.date.toLocaleDateString(undefined, { month: 'short' })}
                {cell.isToday ? ' · Today' : ''}
                {!cell.inPeriod && !cell.isToday ? ' · Outside this month' : ''}
              </p>
              <div className="flex flex-col gap-1.5">
                {cell.entries.map((entry) => (
                  <EventChip key={entry.id} entry={entry} now={now} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
