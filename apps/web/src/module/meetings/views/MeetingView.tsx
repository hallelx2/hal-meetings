import Link from 'next/link';
import { cn } from '@hal/ui';
import { PageHeader } from '@/module/shell/components/PageHeader';
import { HalPlanPanel } from '@/module/dashboard/components/HalPlanPanel';
import { planForMeeting } from '@/module/dashboard/hal-plan';
import { formatLongDate, formatTime } from '@/module/dashboard/zone';
import { LiveRefresh } from '@/module/meetings/components/LiveRefresh';
import { MeetingActions } from '@/module/meetings/components/MeetingActions';
import { TranscriptRail } from '@/module/meetings/components/TranscriptRail';
import type { MeetingDetail } from '@/server/meeting';

/** Colour is never the only encoding — every chip carries its own words. */
const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-lush-green',
  'in-progress': 'bg-air-blue',
  joining: 'bg-air-blue',
  failed: 'bg-sunset-pink',
  cancelled: 'bg-soft-gray-fill',
  scheduled: 'bg-canvas-white',
};

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[11px] font-bold uppercase tracking-adora text-ink/45">{label}</p>
      <p className="text-[14px] text-ink/80">{value}</p>
    </div>
  );
}

/**
 * One meeting, watched from send to summary.
 *
 * The screen this replaces was a sentence on the dashboard saying Hal was on
 * its way, after which everything — joining, waiting in a lobby, being refused,
 * transcribing, failing four times in a loop — happened where only a container
 * log could see it.
 */
export function MeetingView({
  meeting,
  timeZone,
}: {
  meeting: MeetingDetail;
  timeZone: string;
}) {
  const plan = planForMeeting({
    status: meeting.status,
    policy: meeting.policy,
    failureReason: meeting.failureReason,
  });

  const live = meeting.status === 'in-progress' || meeting.status === 'joining';
  const when = meeting.actualStart ?? meeting.scheduledStart;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard"
        className="self-start text-[12px] font-bold uppercase tracking-adora text-ink/50 hover:text-ink"
      >
        ← Dashboard
      </Link>

      <PageHeader
        eyebrow="Meeting"
        title={meeting.title?.trim() || 'Untitled meeting'}
        lede={
          when
            ? `${formatLongDate(when, timeZone)} · ${formatTime(when, timeZone)}`
            : 'Not started yet.'
        }
        action={<LiveRefresh finished={meeting.finished} />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'px-2 py-0.5 text-[10px] font-bold uppercase tracking-adora brutal-border',
            STATUS_STYLES[meeting.status] ?? 'bg-canvas-white',
          )}
        >
          {meeting.status}
        </span>
        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-adora text-ink/60 brutal-border">
          {meeting.platform}
        </span>
      </div>

      {/* The agent's own words, on the screen rather than in a log nobody can
          reach. Every failure this week was diagnosed over SSH. */}
      {meeting.failureReason ? (
        <div className="flex flex-col gap-1 bg-sunset-pink/40 p-4 brutal-border">
          <p className="text-[11px] font-bold uppercase tracking-adora text-ink/60">
            What went wrong
          </p>
          <p className="text-[14px] leading-relaxed text-ink/85">{meeting.failureReason}</p>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <TranscriptRail lines={meeting.lines} live={live} />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <HalPlanPanel plan={plan} />

          <MeetingActions
            meetingId={meeting.id}
            url={meeting.url}
            canRejoin={!live}
          />

          <div className="flex flex-col gap-3 pt-2 brutal-divider">
            {meeting.actualStart ? (
              <Fact
                label="Hal joined"
                value={`${formatLongDate(meeting.actualStart, timeZone)} · ${formatTime(meeting.actualStart, timeZone)}`}
              />
            ) : null}
            {meeting.actualEnd ? (
              <Fact
                label="Hal left"
                value={`${formatLongDate(meeting.actualEnd, timeZone)} · ${formatTime(meeting.actualEnd, timeZone)}`}
              />
            ) : null}
            <Fact label="Policy" value={meeting.policy} />
          </div>
        </div>
      </div>
    </div>
  );
}
