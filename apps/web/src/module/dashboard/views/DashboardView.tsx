import { PageHeader } from '@/module/shell/components/PageHeader';
import { ConnectCalendarButton } from '@/module/cockpit/components/ConnectCalendarButton';
import { JoinMeetForm } from '@/module/cockpit/components/JoinMeetForm';

/**
 * The dashboard as it can honestly be today.
 *
 * The calendar view itself is HAL-805 and needs HAL-801's synced events to draw
 * anything real — so rather than mock a week grid, this screen shows the two
 * things that genuinely work: send Hal into a call now, and connect Calendar so
 * it can start doing that on its own.
 */
export function DashboardView({
  name,
  calendarConnected,
}: {
  name: string | null;
  calendarConnected: boolean;
}) {
  const firstName = name?.split(' ')[0] ?? null;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Dashboard"
        title={firstName ? `Hi, ${firstName}` : 'Welcome back'}
        lede={
          calendarConnected
            ? 'Hal can see your calendar. Paste a Meet link below to send it into a call right now.'
            : 'Hal is ready. Paste a Meet link to send it into a call, or connect your calendar so it can join on its own.'
        }
      />

      {!calendarConnected ? (
        <section className="flex flex-col gap-4 bg-lush-green p-6 brutal-border-2 md:p-8">
          <p className="text-[12px] font-bold uppercase tracking-adora text-ink/60">
            Connect your calendar
          </p>
          <h2 className="max-w-[24ch] text-[26px] leading-[1.05] md:text-[30px]">
            Stop pasting links. Let Hal read the invite.
          </h2>
          <p className="max-w-[60ch] text-[16px] leading-relaxed text-ink/80">
            With calendar access Hal sees which meetings have a Meet link and joins them for you.
            Read-only — it never edits your calendar, and the tokens are envelope-encrypted before
            they touch the database.
          </p>
          <div className="pt-1">
            <ConnectCalendarButton next="/dashboard" />
          </div>
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

      {/* Deliberately absent rather than faked: the week grid, live status and
          past meetings arrive with HAL-805 once HAL-801 syncs real events. An
          empty calendar shell would imply the sync exists. */}
    </div>
  );
}
