import { PageHeader } from '@/module/shell/components/PageHeader';
import { ConnectCalendarButton } from '@/module/cockpit/components/ConnectCalendarButton';
import { StatRow } from '@/module/dashboard/components/StatRow';
import { CalendarGrid } from '@/module/dashboard/components/CalendarGrid';
import { CalendarToolbar } from '@/module/dashboard/components/CalendarToolbar';
import { SendHalDialog } from '@/module/dashboard/components/SendHalDialog';
import { MeetingDetail } from '@/module/dashboard/components/MeetingDetail';
import { CalendarLegend, EventChip } from '@/module/dashboard/components/EventChip';
import {
  buildGrid,
  isLive,
  periodLabel,
  periodStats,
  type CalendarView,
} from '@/module/dashboard/calendar';
import type { CalendarState } from '@/server/dashboard';

function ConnectPrompt() {
  return (
    <section className="flex flex-col gap-4 bg-lush-green p-6 brutal-border-2 md:p-8">
      <p className="text-[12px] font-bold uppercase tracking-adora text-ink/60">
        Connect your calendar
      </p>
      <h2 className="max-w-[24ch] text-[26px] leading-[1.05] md:text-[30px]">
        Stop pasting links. Let Hal read the invite.
      </h2>
      <p className="max-w-[60ch] text-[16px] leading-relaxed text-ink/80">
        With calendar access Hal sees which meetings have a Meet link and joins them for you.
        Read-only — it never edits your calendar, and the tokens are envelope-encrypted before they
        touch the database.
      </p>
      <div className="pt-1">
        <ConnectCalendarButton next="/dashboard" />
      </div>
    </section>
  );
}

function Notice({ title, body, action }: { title: string; body: string; action?: boolean }) {
  return (
    <section className="flex flex-col gap-3 bg-sunset-pink/40 p-6 brutal-border-2">
      <p className="text-[12px] font-bold uppercase tracking-adora text-ink/60">{title}</p>
      <p className="max-w-[60ch] text-[16px] leading-relaxed text-ink/80">{body}</p>
      {action ? (
        <div className="pt-1">
          <ConnectCalendarButton next="/dashboard" label="Reconnect Google Calendar" />
        </div>
      ) : null}
    </section>
  );
}

export function DashboardView({
  name,
  calendar,
  anchor,
  view,
  now,
}: {
  name: string | null;
  calendar: CalendarState;
  anchor: Date;
  view: CalendarView;
  now: Date;
}) {
  const firstName = name?.split(' ')[0] ?? null;
  const entries = calendar.kind === 'ready' ? calendar.entries : [];
  const cells = buildGrid(anchor, now, view, entries);
  const stats = periodStats(cells);
  const label = periodLabel(anchor, view);
  const liveNow = entries.filter((entry) => isLive(entry, now));

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Dashboard"
        title={firstName ? `Hi, ${firstName}` : 'Welcome back'}
        lede={
          calendar.kind === 'ready'
            ? 'Your calendar, and what Hal can do with it.'
            : 'Send Hal into a call, or connect your calendar so it can join on its own.'
        }
        action={<SendHalDialog />}
      />

      {calendar.kind === 'not-connected' ? <ConnectPrompt /> : null}
      {calendar.kind === 'reauth-required' ? (
        <Notice
          title="Calendar disconnected"
          body={`${calendar.message} Google may have revoked the grant, or it expired. Reconnecting takes a moment.`}
          action
        />
      ) : null}
      {calendar.kind === 'error' ? (
        <Notice
          title="Calendar unavailable"
          body={`${calendar.message} Your meetings are safe — this is a temporary problem reaching Google. You can still send Hal into a call below.`}
        />
      ) : null}

      {calendar.kind === 'ready' ? <StatRow stats={stats} periodName={label} /> : null}

      {liveNow.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-[22px] leading-[1.1]">Happening now</h2>
          <ul className="flex flex-col gap-2">
            {liveNow.map((entry) => (
              <li key={entry.id}>
                <MeetingDetail entry={entry} now={now}>
                  <EventChip entry={entry} now={now} />
                </MeetingDetail>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {calendar.kind === 'ready' ? (
        <section className="flex flex-col gap-4">
          <CalendarToolbar anchor={anchor} view={view} label={label} today={now} />
          <CalendarLegend />
          {stats.total === 0 ? (
            <p className="p-6 text-[15px] text-ink/60 brutal-border-2">
              Nothing on your calendar in {label}.
            </p>
          ) : (
            <CalendarGrid cells={cells} view={view} now={now} />
          )}
        </section>
      ) : null}
    </div>
  );
}
