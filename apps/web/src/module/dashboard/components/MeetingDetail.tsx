'use client';

import * as Popover from '@radix-ui/react-popover';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@hal/ui';
import {
  durationMinutes,
  formatDuration,
  isLive,
  type CalendarEntry,
} from '@/module/dashboard/calendar';
import { halPlan } from '@/module/dashboard/hal-plan';
import { formatLongDate, formatTime } from '@/module/dashboard/zone';
import { dismissPopovers, onDismissPopovers } from '@/module/dashboard/popover-bus';
import { MeetingDialog } from '@/module/dashboard/components/MeetingDialog';
import { ScrollPane } from '@/module/dashboard/components/ScrollPane';

/**
 * A calendar chip, with a hover preview and a full record behind it.
 *
 * Two layers, because they answer different questions. The preview is a
 * glance — what is this, when, who called it, is Hal on it — and stays small
 * enough to read without moving the pointer. The dialog is the record, and is
 * where the operator finds out what Hal will actually do about the meeting.
 *
 * The preview used to try to be both, which is why it needed a scrollbar to
 * show a guest list.
 *
 * Opens on hover, click and keyboard focus. Hover alone would strand touch and
 * keyboard users, and with titles truncated in a month cell the panel is the
 * only way to read them — so it cannot be pointer-only.
 */
export function MeetingDetail({
  entry,
  now,
  timeZone,
  children,
}: {
  entry: CalendarEntry;
  now: Date;
  timeZone: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    // A short grace period so the pointer can cross the gap between the chip
    // and the panel without it vanishing underneath them.
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  // Paging the calendar unmounts every chip at once. Without this, each one
  // that was mid-hover leaves a timer that fires into a dead component.
  useEffect(() => cancelClose, []);

  // Any dialog anywhere — this one, or "Send Hal to a meeting" in the header —
  // closes every preview. A popover left open under a modal overlay cannot be
  // dismissed by moving the pointer, because the overlay is eating the events.
  useEffect(() => onDismissPopovers(() => setOpen(false)), []);

  // A preview anchored to a chip that has scrolled away is pointing at nothing.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', close, { capture: true });
  }, [open]);

  const openDialog = () => {
    cancelClose();
    setOpen(false);
    dismissPopovers();
    setExpanded(true);
  };

  const live = isLive(entry, now);
  const duration = formatDuration(durationMinutes(entry));
  const attendees = entry.attendees ?? [];
  const plan = halPlan(entry, now);

  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            onPointerEnter={() => {
              cancelClose();
              setOpen(true);
            }}
            onPointerLeave={scheduleClose}
            onFocus={() => setOpen(true)}
            // Radix composes its own toggle after this handler and skips it
            // when the default is prevented. Without that, closing the preview
            // here and letting the toggle run would reopen it behind the
            // dialog — the exact state this is meant to avoid.
            onClick={(event) => {
              event.preventDefault();
              openDialog();
            }}
            className="block w-full min-w-0 text-left"
          >
            {children}
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            side="right"
            align="start"
            sideOffset={8}
            collisionPadding={16}
            onPointerEnter={cancelClose}
            onPointerLeave={scheduleClose}
            // A preview must never steal focus, or the pointer crossing the
            // grid would yank the caret around the page.
            onOpenAutoFocus={(event) => event.preventDefault()}
            className={cn(
              'z-50 flex w-[min(21rem,calc(100vw-2rem))] flex-col gap-3 bg-canvas-white p-4 brutal-border-2',
              'shadow-[6px_6px_0_0_var(--color-ink)]',
            )}
          >
            <div className="flex flex-wrap items-center gap-1.5">
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
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-[17px] leading-[1.15]">{entry.title}</h3>
              <p className="text-[13px] text-ink/70">
                {formatLongDate(entry.start, timeZone)} · {formatTime(entry.start, timeZone)}
                {entry.end ? `–${formatTime(entry.end, timeZone)}` : ''}
                {duration ? ` · ${duration}` : ''}
              </p>
            </div>

            {/* One line each, and only what fits at a glance. Everything the
                preview used to scroll through now lives in the dialog. */}
            {entry.organizer ? (
              <p className="truncate text-[13px] text-ink/65" title={entry.organizer}>
                Called by {entry.organizer}
              </p>
            ) : null}
            {attendees.length > 0 ? (
              <p className="text-[13px] text-ink/65">
                {attendees.length} {attendees.length === 1 ? 'guest' : 'guests'}
              </p>
            ) : null}

            {entry.description ? (
              // The one thing here with no natural length. Capped and faded
              // rather than truncated mid-word, so it is obvious there is more.
              <ScrollPane className="max-h-24">
                <p className="whitespace-pre-wrap break-words pr-2 text-[13px] leading-relaxed text-ink/70">
                  {entry.description}
                </p>
              </ScrollPane>
            ) : null}

            <p className="bg-soft-gray-fill px-2.5 py-2 text-[12px] leading-snug text-ink/75 brutal-border">
              {plan.headline}
            </p>

            <button
              type="button"
              onClick={openDialog}
              className="inline-flex h-9 items-center justify-center bg-ink px-3 text-[11px] font-bold uppercase tracking-adora text-canvas-white transition-colors hover:bg-ink-soft"
            >
              Everything about this meeting
            </button>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <MeetingDialog
        entry={entry}
        now={now}
        timeZone={timeZone}
        open={expanded}
        onOpenChange={setExpanded}
      />
    </>
  );
}
