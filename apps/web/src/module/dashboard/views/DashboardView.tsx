import { PageHeader } from '@/module/shell/components/PageHeader';
import { ConnectCalendarButton } from '@/module/cockpit/components/ConnectCalendarButton';
import { JoinMeetForm } from '@/module/cockpit/components/JoinMeetForm';
import { WeekCalendar } from '@/module/dashboard/components/WeekCalendar';
import { isLive } from '@/module/dashboard/week';
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
  now,
}: {
  name: string | null;
  calendar: CalendarState;
  now: Date;
}) {
  const firstName = name?.split(' ')[0] ?? null;
  const entries = calendar.kind === 'ready' ? calendar.entries : [];
  const liveNow = entries.filter((entry) => isLive(entry, now));
  const joinable = entries.filter((entry) => entry.joinable).length;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Dashboard"
        title={firstName ? `Hi, ${firstName}` : 'Welcome back'}
        lede={
          calendar.kind === 'ready'
            ? joinable > 0
              ? `${joinable} meeting${joinable === 1 ? '' : 's'} this week Hal can join.`
              : 'Nothing with a Meet link this week. Paste one below to send Hal into a call now.'
            : 'Paste a Meet link to send Hal into a call, or connect your calendar so it can join on its own.'
        }
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

      {liveNow.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-[22px] leading-[1.1]">Happening now</h2>
          <ul className="flex flex-col gap-2">
            {liveNow.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-air-blue p-4 brutal-border-2"
              >
                <span className="min-w-0 text-[16px] font-semibold">{entry.title}</span>
                {entry.status ? (
                  <span className="shrink-0 whitespace-nowrap text-[12px] font-bold uppercase tracking-adora">
                    {entry.status}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {calendar.kind === 'ready' ? (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-[22px] leading-[1.1]">This week</h2>
            <p className="text-[12px] font-bold uppercase tracking-adora text-ink/45">
              Green · Hal can join
            </p>
          </div>
          {entries.length === 0 ? (
            <p className="p-6 text-[15px] text-ink/60 brutal-border-2">
              No events on your calendar this week.
            </p>
          ) : (
            <WeekCalendar entries={entries} now={now} />
          )}
        </section>
      ) : null}

      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h2 className="text-[22px] leading-[1.1]">Send Hal to a meeting</h2>
          <p className="max-w-[60ch] text-[16px] leading-relaxed text-ink/70">
            Paste a Google Meet link. Hal joins, announces itself, transcribes, and emails you the
            summary when the call ends.
          </p>
        </div>
        <div className="p-6 brutal-border-2 md:p-8">
          <JoinMeetForm />
        </div>
      </section>
    </div>
  );
}
