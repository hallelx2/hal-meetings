import type { ReactNode } from 'react';
import Link from 'next/link';
import { HalWordmark } from '@/components/shared/HalWordmark';
import { AppNav } from '@/module/shell/components/AppNav';
import { CalendarStatusChip } from '@/module/shell/components/CalendarStatusChip';

/**
 * The chrome, rendered once by the (app) layout.
 *
 * Server component. It renders one client leaf — AppNav, which needs the
 * pathname to mark the active route — and is otherwise plain HTML, so
 * navigating between screens does not re-mount the nav or ship it twice.
 */
export function AppShell({
  email,
  calendarConnected,
  children,
}: {
  email: string;
  calendarConnected: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-h-svh bg-canvas-white text-ink">
      {/* Sidebar — desktop only. The dock below takes over under lg. */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[248px] flex-col gap-8 bg-canvas-white p-6 brutal-border-2 border-t-0 border-b-0 border-l-0">
        <Link href="/dashboard" aria-label="Hal dashboard" className="flex items-center">
          <HalWordmark size="sm" />
        </Link>
        <AppNav layout="sidebar" />
        <div className="mt-auto flex flex-col gap-3">
          <CalendarStatusChip connected={calendarConnected} />
          <p className="break-all text-[12px] font-bold uppercase tracking-adora text-ink/45">
            {email}
          </p>
        </div>
      </aside>

      {/* The offset belongs to the shell, not to each screen — a screen that
          carries its own margin-left slides under the sidebar the moment the
          sidebar width changes. */}
      <div className="lg:pl-[248px]">
        <header className="lg:hidden sticky top-0 z-40 flex h-[68px] items-center justify-between gap-4 bg-canvas-white px-5 brutal-border-2 border-t-0 border-l-0 border-r-0">
          <Link href="/dashboard" aria-label="Hal dashboard" className="flex items-center">
            <HalWordmark size="sm" />
          </Link>
          <CalendarStatusChip connected={calendarConnected} compact />
        </header>

        {/* Bottom padding clears the mobile dock so the last control on a screen
            is never trapped underneath it. */}
        <main className="mx-auto w-full max-w-[1120px] px-5 py-8 pb-28 lg:px-10 lg:py-12 lg:pb-12">
          {children}
        </main>
      </div>

      <AppNav layout="dock" />
    </div>
  );
}
