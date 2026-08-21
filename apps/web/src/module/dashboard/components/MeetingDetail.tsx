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

function time(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function longDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

const RESPONSE_LABELS: Record<string, string> = {
  accepted: 'Yes',
  declined: 'No',
  tentative: 'Maybe',
  needsAction: 'No reply',
};

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[11px] font-bold uppercase tracking-adora text-ink/45">{label}</p>
      {children}
    </div>
  );
}

/**
 * Everything Hal knows about one meeting.
 *
 * Radix Popover rather than a hand-rolled panel: focus management, escape
 * handling, portalling out of the grid's overflow, and the ARIA wiring are all
 * things this needs and all things that are quietly wrong when hand-written.
 *
 * Opens on hover, click and keyboard focus. Hover alone would strand touch
 * users and keyboard users — and with titles truncated in a month cell, the
 * panel is the only way to read them, so it cannot be pointer-only.
 */
export function MeetingDetail({
  entry,
  now,
  children,
}: {
  entry: CalendarEntry;
  now: Date;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // Distinguishes "opened by pointer" from "opened deliberately". A click or a
  // keypress should survive the pointer leaving; a hover should not.
  const pinned = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    if (pinned.current) return;
    cancelClose();
    // A short grace period so the pointer can cross the gap between the chip
    // and the panel without it vanishing underneath them.
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  // Paging the calendar unmounts every chip at once. Without this, each one
  // that was mid-hover leaves a timer that fires into a dead component.
  useEffect(() => cancelClose, []);

  const live = isLive(entry, now);
  const duration = formatDuration(durationMinutes(entry));
  const attendees = entry.attendees ?? [];

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) pinned.current = false;
        setOpen(next);
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          onPointerEnter={() => {
            cancelClose();
            setOpen(true);
          }}
          onPointerLeave={scheduleClose}
          onFocus={() => {
            pinned.current = true;
            setOpen(true);
          }}
          onClick={() => {
            pinned.current = true;
            setOpen(true);
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
          // Hover-opened panels must not steal focus, or the pointer moving
          // across the grid would yank the caret around the page.
          onOpenAutoFocus={(event) => {
            if (!pinned.current) event.preventDefault();
          }}
          className={cn(
            'z-50 w-[min(22rem,calc(100vw-2rem))] bg-canvas-white p-4 brutal-border-2',
            'shadow-[6px_6px_0_0_var(--color-ink)]',
          )}
        >
          <div className="flex max-h-[min(28rem,70vh)] flex-col gap-4 overflow-y-auto">
            <header className="flex flex-col gap-2">
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
              <h3 className="text-[19px] leading-[1.15]">{entry.title}</h3>
              <p className="text-[13px] text-ink/70">
                {longDate(entry.start)} · {time(entry.start)}
                {entry.end ? `–${time(entry.end)}` : ''}
                {duration ? ` · ${duration}` : ''}
              </p>
            </header>

            {entry.location ? (
              <Section label="Location">
                <p className="break-words text-[13px] text-ink/80">{entry.location}</p>
              </Section>
            ) : null}

            {entry.organizer ? (
              <Section label="Organiser">
                <p className="break-all text-[13px] text-ink/80">{entry.organizer}</p>
              </Section>
            ) : null}

            {attendees.length > 0 ? (
              <Section label={`Attendees · ${attendees.length}`}>
                <ul className="flex flex-col gap-1">
                  {attendees.map((person) => (
                    <li
                      key={person.email}
                      className="flex items-baseline justify-between gap-2 text-[13px]"
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
              <Section label="Description">
                <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-ink/75">
                  {entry.description}
                </p>
              </Section>
            ) : null}

            <Section label="Notes from Hal">
              {/* Deliberately not invented. Hal has not attended a meeting yet,
                  and a panel of plausible-looking notes that came from nowhere
                  teaches the operator to trust a surface that is lying. */}
              <p className="text-[13px] leading-relaxed text-ink/55">
                {entry.status === 'completed'
                  ? 'Hal attended this meeting. The transcript and summary will appear here.'
                  : entry.joinable
                    ? 'Nothing yet — Hal writes the summary here after it attends.'
                    : 'Hal cannot join this one, so there will be no notes.'}
              </p>
            </Section>

            <footer className="flex flex-wrap gap-2 pt-1">
              {entry.url ? (
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center whitespace-nowrap bg-ink px-3 text-[12px] font-bold uppercase tracking-adora text-canvas-white hover:bg-ink-soft"
                >
                  Open {entry.platform ?? 'link'}
                </a>
              ) : null}
              {entry.htmlLink ? (
                <a
                  href={entry.htmlLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center whitespace-nowrap px-3 text-[12px] font-bold uppercase tracking-adora brutal-border hover:bg-lush-green"
                >
                  In Google Calendar
                </a>
              ) : null}
            </footer>
          </div>

          <Popover.Arrow className="fill-ink" width={14} height={7} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
