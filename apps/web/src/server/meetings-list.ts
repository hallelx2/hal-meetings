import 'server-only';

import { getRepos } from '@/server/hal';

export type MeetingSummaryRow = {
  id: string;
  title: string | null;
  platform: string;
  status: string;
  when: Date | null;
  /** Transcript lines captured. Zero is meaningful, not missing. */
  lineCount: number;
  /** True while Hal is still working on it. */
  live: boolean;
};

const LIVE = new Set(['joining', 'in-progress']);

/**
 * Every meeting Hal knows about for this user, newest first.
 *
 * Scoped by `userId` because that is how `listRecentForUser` is keyed today.
 * When a workspace grows a second member this needs to become workspace-scoped,
 * the same way `loadMeeting` already is — noted rather than pre-built, since
 * guessing at the multi-member model now would harden the wrong shape.
 */
export async function loadMeetingsList(
  userId: string,
  limit = 50,
): Promise<MeetingSummaryRow[]> {
  const repos = getRepos();

  const meetings = await repos.meetings.listRecentForUser(userId, limit).catch(() => []);
  if (meetings.length === 0) return [];

  // One query for all counts. Doing this per row is an N+1 that gets slower
  // precisely as somebody uses the product more.
  const counts = await repos.transcriptSegments
    .countsForMeetings(meetings.map((m) => m.id))
    .catch(() => new Map<string, number>());

  return meetings.map((meeting) => ({
    id: meeting.id,
    title: meeting.title,
    platform: meeting.platform,
    status: meeting.status,
    when: meeting.actualStart ?? meeting.scheduledStart,
    lineCount: counts.get(meeting.id) ?? 0,
    live: LIVE.has(meeting.status),
  }));
}
