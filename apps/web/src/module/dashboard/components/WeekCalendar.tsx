import { cn } from '@hal/ui';
import { buildWeek, isLive, type CalendarEntry } from '@/module/dashboard/week';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function time(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function EntryCard({ entry, now }: { entry: CalendarEntry; now: Date }) {
  const live = isLive(entry, now);

  return (
    <li
      className={cn(
        'flex flex-col gap-1 p-2.5 brutal-border',
        // Joinable is the signal that carries the whole screen: it must read at
        // a glance, without hovering or clicking.
        entry.joinable ? 'bg-lush-green' : 'bg-soft-gray-fill',
        live && 'bg-air-blue',
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono-grit text-[12px] font-bold tabular-nums text-ink/70">
          {time(entry.start)}
        </span>
        {live ? (
          <span className="shrink-0 whitespace-nowrap text-[10px] font-bold uppercase tracking-adora text-ink">
            Live
          </span>
        ) : null}
      </div>

      <p className="line-clamp-2 text-[13px] font-semibold leading-[1.2] text-ink">
        {entry.title}
      </p>

      {entry.platform ? (
        <span
          className={cn(
            'mt-0.5 inline-flex w-fit items-center whitespace-nowrap px-1.5 py-0.5',
            'text-[10px] font-bold uppercase tracking-adora',
            entry.joinable
              ? 'bg-ink text-canvas-white'
              : 'brutal-border text-ink/60',
          )}
        >
          {entry.joinable ? 'Meet' : `${entry.platform} · not yet`}
        </span>
      ) : null}
    </li>
  );
}

/**
 * The week, as a grid on desktop and an agenda on mobile.
 *
 * Two renderings of one dataset rather than a grid squashed into 375px — seven
 * columns on a phone is unreadable, and a horizontal scroller hides half the
 * week behind a gesture nobody discovers.
 */
export function WeekCalendar({ entries, now }: { entries: CalendarEntry[]; now: Date }) {
  const week = buildWeek(now, entries);
  const withEntries = week.filter((day) => day.entries.length > 0);

  return (
    <>
      {/* Desktop: seven columns. */}
      <div className="hidden lg:grid lg:grid-cols-7 lg:gap-0 brutal-border-2">
        {week.map((day, index) => (
          <div
            key={day.date.toISOString()}
            className={cn(
              'flex min-h-[220px] min-w-0 flex-col gap-2 p-3',
              index < 6 && 'border-r-[1.5px] border-ink/20',
              day.isToday && 'bg-lush-green/25',
            )}
          >
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-[11px] font-bold uppercase tracking-adora text-ink/55">
                {DAY_NAMES[index]}
              </span>
              <span
                className={cn(
                  'font-mono-grit text-[13px] font-bold tabular-nums',
                  day.isToday ? 'text-ink' : 'text-ink/45',
                )}
              >
                {day.date.getDate()}
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {day.entries.map((entry) => (
                <EntryCard key={entry.id} entry={entry} now={now} />
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Mobile: an agenda of the days that actually have something on them. */}
      <div className="flex flex-col gap-5 lg:hidden">
        {withEntries.length === 0 ? (
          <p className="text-[15px] text-ink/60">Nothing scheduled this week.</p>
        ) : (
          withEntries.map((day) => (
            <div key={day.date.toISOString()} className="flex flex-col gap-2">
              <p
                className={cn(
                  'text-[12px] font-bold uppercase tracking-adora',
                  day.isToday ? 'text-ink' : 'text-ink/50',
                )}
              >
                {DAY_NAMES[week.indexOf(day)]} {day.date.getDate()}
                {day.isToday ? ' · Today' : ''}
              </p>
              <ul className="flex flex-col gap-2">
                {day.entries.map((entry) => (
                  <EntryCard key={entry.id} entry={entry} now={now} />
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </>
  );
}
