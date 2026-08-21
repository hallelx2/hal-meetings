import { requireSession } from '@/server/session';
import { DashboardView } from '@/module/dashboard/views/DashboardView';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await requireSession();

  return (
    <DashboardView
      name={session.name}
      calendarConnected={session.calendarConnected}
    />
  );
}
