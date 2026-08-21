import { PageHeader } from '@/module/shell/components/PageHeader';
import { ConnectCalendarButton } from '@/module/cockpit/components/ConnectCalendarButton';
import { SessionActions } from '@/module/cockpit/components/SessionActions';
import type { CalendarConnection } from '@/lib/google-scopes';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <span className="shrink-0 text-[12px] font-bold uppercase tracking-adora text-ink/50">
        {label}
      </span>
      <span className="min-w-0 break-all text-[16px] text-ink/85">{value}</span>
    </div>
  );
}

/**
 * Account and connections.
 *
 * This screen gathers up controls that were previously stranded under a URL
 * field on the cockpit — nothing here is new behaviour, it has just been given
 * somewhere to live. The privacy notes and account deletion are HAL-830.
 */
const CONNECTION_COPY: Record<CalendarConnection, string> = {
  connected:
    'Connected, read-only. Hal reads your events to know which meetings to join. It never edits your calendar, and the tokens are envelope-encrypted before they touch the database.',
  'needs-reconnect':
    'Access was granted, but Hal can no longer renew it — Google issues a renewable token only when consent is given explicitly. Reconnecting restores the sync; nothing else is affected.',
  'not-connected':
    'Not connected. Without it Hal cannot join meetings on its own — you will need to paste each Meet link by hand.',
};

export function SettingsView({
  email,
  name,
  calendar,
}: {
  email: string;
  name: string | null;
  calendar: CalendarConnection;
}) {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Settings"
        title="Account"
        lede="Who you are to Hal, and what it is allowed to see."
      />

      <section className="flex flex-col gap-4">
        <h2 className="text-[22px] leading-[1.1]">Account</h2>
        <div className="px-6 brutal-border-2 divide-y-[1.5px] divide-ink/15">
          <Row label="Name" value={name ?? 'Not provided by Google'} />
          <Row label="Email" value={email} />
          <Row label="Sign-in" value="Google" />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-[22px] leading-[1.1]">Connections</h2>
        <div className="flex flex-col gap-5 p-6 brutal-border-2 md:p-8">
          <div className="flex flex-col gap-2">
            <p className="text-[12px] font-bold uppercase tracking-adora text-ink/50">
              Google Calendar
            </p>
            <p className="max-w-[60ch] text-[16px] leading-relaxed text-ink/80">
              {CONNECTION_COPY[calendar]}
            </p>
          </div>
          {calendar === 'connected' ? null : (
            <div>
              <ConnectCalendarButton
                next="/settings"
                variant="secondary"
                label={calendar === 'needs-reconnect' ? 'Reconnect Google Calendar' : undefined}
              />
            </div>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-[22px] leading-[1.1]">Session</h2>
        <div className="p-6 brutal-border-2 md:p-8">
          <SessionActions googleConnected={calendar !== 'not-connected'} />
        </div>
      </section>

      {/* Privacy notes and delete-account are HAL-830. Not stubbed here — a
          disabled "Delete account" button is worse than none. */}
    </div>
  );
}
