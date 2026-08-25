import { requireSession } from '@/server/session';
import { loadMeetingsList } from '@/server/meetings-list';
import { MeetingsListView } from '@/module/meetings/views/MeetingsListView';
import { DEFAULT_TIME_ZONE } from '@/module/dashboard/zone';
import { DEFAULT_BOT_NAME_TEMPLATE, renderBotName } from '@hal/meeting-links';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await requireSession();

  const meetings = session.userId ? await loadMeetingsList(session.userId) : [];

  return (
    <MeetingsListView
      meetings={meetings}
      timeZone={DEFAULT_TIME_ZONE}
      // Same template and renderer the agent uses, so the name the dialog
      // promises is the name that appears in the lobby.
      botName={renderBotName(
        process.env.HAL_BOT_DISPLAY_NAME ?? DEFAULT_BOT_NAME_TEMPLATE,
        session.name ?? session.email.split('@')[0],
      )}
    />
  );
}
