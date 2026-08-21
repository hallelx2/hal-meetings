import type { ReactNode } from 'react';
import { AppShell } from '@/module/shell/layout/AppShell';
import { requireSession } from '@/server/session';

export const dynamic = 'force-dynamic';

/**
 * Coarse gate plus the chrome. Every authenticated screen renders inside this,
 * so the sidebar, dock and status chip exist exactly once.
 *
 * Not the only gate — see requireSession(). Layouts are not reliably re-run on
 * in-app navigation, so each page re-checks.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();

  return (
    <AppShell email={session.email} calendarConnected={session.calendarConnected}>
      {children}
    </AppShell>
  );
}
