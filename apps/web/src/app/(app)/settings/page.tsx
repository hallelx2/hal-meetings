import { requireSession } from '@/server/session';
import { SettingsView } from '@/module/settings/views/SettingsView';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await requireSession();

  return (
    <SettingsView
      email={session.email}
      name={session.name}
      calendar={session.calendar}
    />
  );
}
