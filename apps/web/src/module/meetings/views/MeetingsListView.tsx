import Link from 'next/link';
import { cn } from '@hal/ui';
import { PageHeader } from '@/module/shell/components/PageHeader';
import { SendHalDialog } from '@/module/dashboard/components/SendHalDialog';
import { formatLongDate, formatTime } from '@/module/dashboard/zone';
import type { MeetingSummaryRow } from '@/server/meetings-list';

/** Colour is never the only encoding — the status word is always present. */
const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-lush-green',
  'in-progress': 'bg-air-blue',
  joining: 'bg-air-blue',
  failed: 'bg-sunset-pink',
  cancelled: 'bg-soft-gray-fill',
  scheduled: 'bg-canvas-white',
};

function Row({ meeting, timeZone }: { meeting: MeetingSummaryRow; timeZone: string }) {
  return (
    <li>
      <Link
        href={`/meetings/${meeting.id}`}
        className="flex flex-col gap-2 p-4 brutal-border transition-colors hover:bg-lush-green/40 md:flex-row md:items-center md:justify-between"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <p className="truncate text-[16px] leading-snug">
            {meeting.title?.trim() || 'Untitled meeting'}
          </p>
          <p className="text-[13px] text-ink/60">
            {meeting.when
              ? `${formatLongDate(meeting.when, timeZone)} · ${formatTime(meeting.when, timeZone)}`
              : 'Not started'}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* Zero is a fact worth showing, not an absence to hide: a completed
              meeting with no lines means something went wrong, and hiding the
              count would make that indistinguishable from a good recording. */}
          <span className="text-[12px] font-bold uppercase tracking-adora text-ink/50">
            {meeting.lineCount} {meeting.lineCount === 1 ? 'line' : 'lines'}
          </span>
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-adora text-ink/60 brutal-border">
            {meeting.platform}
          </span>
          <span
            className={cn(
              'px-2 py-0.5 text-[10px] font-bold uppercase tracking-adora brutal-border',
              STATUS_STYLES[meeting.status] ?? 'bg-canvas-white',
            )}
          >
            {meeting.live ? 'live now' : meeting.status}
          </span>
        </div>
      </Link>
    </li>
  );
}

/**
 * Every meeting Hal has been sent to, and what came of each.
 *
 * The transcripts live on the individual meeting pages rather than here: a list
 * that inlined them would be a wall of text nobody can scan, and the one thing
 * this screen has to do well is let someone find the meeting they are thinking
 * of.
 */
export function MeetingsListView({
  meetings,
  timeZone,
  botName,
}: {
  meetings: MeetingSummaryRow[];
  timeZone: string;
  botName: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Meetings"
        title="Meetings and transcripts"
        lede="Every meeting Hal has been sent to. Open one for its transcript, its status, and what Hal did."
        action={<SendHalDialog botName={botName} />}
      />

      {meetings.length === 0 ? (
        <div className="flex flex-col gap-2 bg-soft-gray-fill p-6 brutal-border">
          <p className="text-[16px] leading-relaxed">Hal has not been to a meeting yet.</p>
          <p className="text-[14px] leading-relaxed text-ink/70">
            Send it to one and this page fills up — every meeting, its transcript, and whether it
            worked.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {meetings.map((meeting) => (
            <Row key={meeting.id} meeting={meeting} timeZone={timeZone} />
          ))}
        </ul>
      )}
    </div>
  );
}
