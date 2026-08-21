'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { cn } from '@hal/ui';
import {
  durationMinutes,
  formatDuration,
  isLive,
  type CalendarEntry,
} from '@/module/dashboard/calendar';
import { halPlan } from '@/module/dashboard/hal-plan';
import { formatLongDate, formatTime } from '@/module/dashboard/zone';
import { HalPlanPanel } from '@/module/dashboard/components/HalPlanPanel';
import { ScrollPane } from '@/module/dashboard/components/ScrollPane';

const RESPONSE_LABELS: Record<string, string> = {
  accepted: 'Yes',
  declined: 'No',
  tentative: 'Maybe',
  needsAction: 'No reply',
};

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-[11px] font-bold uppercase tracking-adora text-ink/45">{label}</h3>
      {children}
    </section>
  );
}

/**
 * Sending Hal to *this* meeting, rather than to a link pasted from nowhere.
 *
 * The endpoint is the same one the header modal uses, because the work is the
 * same work. What changes is that the URL is already known, so the operator is
 * one button from the thing they wanted instead of copying a link out of one
 * panel and into another.
 */
function SendHalToThisMeeting({ url }: { url: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage(null);
          const res = await fetch('/api/meetings/join', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ url }),
          }).catch(() => null);

          setBusy(false);
          if (!res?.ok) {
            setMessage('Could not enqueue the join. The link is still open below.');
            return;
          }
          setMessage('Hal is on its way. Admit the guest named Hal in the Meet lobby.');
          router.refresh();
        }}
        className="inline-flex h-11 items-center justify-center bg-ink px-5 text-[13px] font-bold uppercase tracking-adora text-canvas-white transition-colors hover:bg-ink-soft disabled:opacity-60"
      >
        {busy ? 'Sending Hal…' : 'Send Hal to this meeting'}
      </button>
      {/* The confirmation carries an instruction the user has to act on, so it
          stays on screen rather than flashing past as a toast. */}
      {message ? <p className="text-[13px] leading-relaxed text-ink/75">{message}</p> : null}
    </div>
  );
}

/**
 * The whole record for one meeting.
 *
 * The hover preview can show what a meeting *is*. This is where the question
 * the preview cannot answer gets answered: what Hal will do about it, in what
 * order, and how far along that is — see `HalPlanPanel`.
 *
 * Radix Dialog for the focus trap, scroll lock, escape handling and ARIA
 * wiring, all of which are needed here and all of which are routinely subtly
 * wrong when hand-rolled.
 */
export function MeetingDialog({
  entry,
  now,
  timeZone,
  open,
  onOpenChange,
}: {
  entry: CalendarEntry;
  now: Date;
  timeZone: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const live = isLive(entry, now);
  const duration = formatDuration(durationMinutes(entry));
  const attendees = entry.attendees ?? [];
  const plan = halPlan(entry, now);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[min(46rem,92vh)] w-[min(56rem,calc(100vw-2rem))]',
            '-translate-x-1/2 -translate-y-1/2 flex-col bg-canvas-white brutal-border-2',
            'shadow-[8px_8px_0_0_var(--color-ink)]',
          )}
        >
          <header className="flex shrink-0 flex-col gap-3 border-b-2 border-ink p-5 md:p-6">
            <div className="flex flex-wrap items-center gap-2">
              {live ? (
                <span className="bg-air-blue px-2 py-0.5 text-[10px] font-bold uppercase tracking-adora brutal-border">
                  Live now
                </span>
              ) : null}
              {entry.joinable ? (
                <span className="bg-lush-green px-2 py-0.5 text-[10px] font-bold uppercase tracking-adora brutal-border">
                  Hal can join
                </span>
              ) : entry.platform ? (
                <span className="bg-soft-gray-fill px-2 py-0.5 text-[10px] font-bold uppercase tracking-adora brutal-border">
                  {entry.platform} · not yet
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-adora text-ink/45 brutal-border">
                  No meeting link
                </span>
              )}
              {entry.status ? (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-adora text-ink/60 brutal-border">
                  {entry.status}
                </span>
              ) : null}
            </div>

            <Dialog.Title className="text-[24px] leading-[1.08] md:text-[30px]">
              {entry.title}
            </Dialog.Title>
            <Dialog.Description className="text-[14px] text-ink/70">
              {formatLongDate(entry.start, timeZone)} · {formatTime(entry.start, timeZone)}
              {entry.end ? `–${formatTime(entry.end, timeZone)}` : ''}
              {duration ? ` · ${duration}` : ''}
            </Dialog.Description>
          </header>

          <ScrollPane className="p-5 md:p-6">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-6">
                {entry.location ? (
                  <Section label="Location">
                    <p className="break-words text-[14px] text-ink/80">{entry.location}</p>
                  </Section>
                ) : null}

                {entry.organizer ? (
                  <Section label="Organiser">
                    <p className="break-all text-[14px] text-ink/80">{entry.organizer}</p>
                  </Section>
                ) : null}

                {attendees.length > 0 ? (
                  <Section label={`Attendees · ${attendees.length}`}>
                    <ul className="flex flex-col divide-y divide-ink/10">
                      {attendees.map((person) => (
                        <li
                          key={person.email}
                          className="flex items-baseline justify-between gap-3 py-1.5 text-[14px]"
                        >
                          <span className="min-w-0 truncate text-ink/80" title={person.email}>
                            {person.email}
                            {person.isSelf ? ' (you)' : ''}
                          </span>
                          {person.response ? (
                            <span className="shrink-0 whitespace-nowrap text-[11px] font-bold uppercase tracking-adora text-ink/45">
                              {RESPONSE_LABELS[person.response] ?? person.response}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </Section>
                ) : null}

                {entry.description ? (
                  <Section label="Agenda">
                    <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-ink/75">
                      {entry.description}
                    </p>
                  </Section>
                ) : null}

                <Section label="Notes from Hal">
                  {/* Deliberately not invented. A panel of plausible-looking
                      notes that came from nowhere teaches the operator to trust
                      a surface that is lying to them. */}
                  <p className="text-[14px] leading-relaxed text-ink/55">
                    {plan.posture === 'done'
                      ? 'Hal attended. The transcript and summary land here once the meeting record screen ships.'
                      : 'Nothing yet — Hal writes the summary here after it attends.'}
                  </p>
                </Section>
              </div>

              <div className="flex min-w-0 flex-col gap-6">
                <HalPlanPanel plan={plan} />
                {plan.sendable && entry.url ? <SendHalToThisMeeting url={entry.url} /> : null}
              </div>
            </div>
          </ScrollPane>

          <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t-2 border-ink p-4 md:px-6">
            {entry.url ? (
              <a
                href={entry.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center whitespace-nowrap px-4 text-[12px] font-bold uppercase tracking-adora brutal-border hover:bg-lush-green"
              >
                Open {entry.platform ?? 'link'}
              </a>
            ) : null}
            {entry.htmlLink ? (
              <a
                href={entry.htmlLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center whitespace-nowrap px-4 text-[12px] font-bold uppercase tracking-adora brutal-border hover:bg-lush-green"
              >
                In Google Calendar
              </a>
            ) : null}
            <Dialog.Close asChild>
              <button
                type="button"
                className="ml-auto inline-flex h-10 items-center whitespace-nowrap px-4 text-[12px] font-bold uppercase tracking-adora brutal-border hover:bg-lush-green"
              >
                Close
              </button>
            </Dialog.Close>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
