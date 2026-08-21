'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { JoinMeetForm } from '@/module/cockpit/components/JoinMeetForm';
import { dismissPopovers } from '@/module/dashboard/popover-bus';

/**
 * Sending Hal into an ad-hoc call, as a modal.
 *
 * It used to be a permanent slab at the bottom of the dashboard — the
 * least-used control taking the most space, below a calendar that is the actual
 * point of the screen.
 *
 * Radix Dialog rather than a hand-rolled overlay: focus trap, scroll lock,
 * escape handling, backdrop click and the ARIA wiring are all needed here and
 * all routinely wrong when written by hand.
 */
export function SendHalDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        // A hover preview left open under the overlay cannot be dismissed by
        // moving the pointer — the overlay swallows the events — so it has to
        // be told to go.
        if (next) dismissPopovers();
        setOpen(next);
      }}
    >
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-11 items-center whitespace-nowrap bg-ink px-5 text-[13px] font-bold uppercase tracking-adora text-canvas-white transition-colors hover:bg-ink-soft"
        >
          Send Hal to a meeting
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 bg-canvas-white p-6 brutal-border-2 shadow-[8px_8px_0_0_var(--color-ink)] md:p-8"
        >
          <div className="flex max-h-[80vh] flex-col gap-5 overflow-y-auto">
            <div className="flex flex-col gap-2">
              <Dialog.Title className="text-[26px] leading-[1.05]">
                Send Hal to a meeting
              </Dialog.Title>
              <Dialog.Description className="text-[15px] leading-relaxed text-ink/75">
                Paste a Google Meet link. Hal joins, announces itself, transcribes, and emails you
                the summary when the call ends.
              </Dialog.Description>
            </div>

            {/* Deliberately does not close on success. The confirmation carries
                an instruction the user has to act on — admit the guest named Hal
                in the Meet lobby — and a modal that vanishes takes that with it. */}
            <JoinMeetForm />

            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center self-start px-4 text-[12px] font-bold uppercase tracking-adora brutal-border hover:bg-lush-green"
              >
                Close
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
