import 'server-only';

import { getEnvelope, getRepos } from '@/server/hal';

export type MeetingLine = {
  seq: number;
  speaker: string | null;
  startMs: number | null;
  text: string;
};

export type MeetingDetail = {
  id: string;
  title: string | null;
  platform: string;
  url: string | null;
  status: string;
  policy: string;
  failureReason: string | null;
  scheduledStart: Date | null;
  actualStart: Date | null;
  actualEnd: Date | null;
  lines: MeetingLine[];
  /** True once the meeting has reached a terminal state. */
  finished: boolean;
};

export type MeetingLoad =
  | { kind: 'not-found' }
  | { kind: 'ready'; meeting: MeetingDetail };

const TERMINAL = new Set(['completed', 'failed', 'cancelled']);

/**
 * Load one meeting for the page that watches it.
 *
 * Ownership is checked against the **workspace**, not just the meeting's
 * `userId`. A meeting belongs to a workspace, and a workspace will eventually
 * have more than one member; scoping on `userId` alone would silently become
 * wrong the day it does, in a direction that hides other people's meetings
 * rather than leaking them — a bug that looks like nothing until someone
 * complains their teammate's recording is missing.
 *
 * Returns `not-found` rather than `forbidden` for a meeting the caller may not
 * see. Telling a stranger that an id exists is itself a disclosure.
 */
export async function loadMeeting(
  meetingId: string,
  userId: string,
): Promise<MeetingLoad> {
  const repos = getRepos();

  const meeting = await repos.meetings.findById(meetingId).catch(() => null);
  if (!meeting) return { kind: 'not-found' };

  const workspace = await repos.workspaces.findForUser(userId);
  if (!workspace || workspace.id !== meeting.workspaceId) return { kind: 'not-found' };

  const segments = await repos.transcriptSegments
    .listForMeeting(meetingId)
    .catch(() => []);

  const envelope = getEnvelope();
  const lines: MeetingLine[] = [];

  for (const segment of segments) {
    try {
      const text = await envelope.decryptString({
        wrappedDek: workspace.dekWrapped,
        keyId: workspace.dekKmsKeyId,
        ciphertext: segment.textCt,
      });
      lines.push({
        seq: segment.seq,
        speaker: segment.speaker,
        startMs: segment.startMs,
        text,
      });
    } catch {
      // One unreadable segment must not blank the whole transcript. Skipping it
      // loses a line; throwing would lose the meeting, and the reader would
      // have no way to tell the difference between "nothing was said" and
      // "something is broken".
      lines.push({
        seq: segment.seq,
        speaker: segment.speaker,
        startMs: segment.startMs,
        text: '⚠ this line could not be decrypted',
      });
    }
  }

  return {
    kind: 'ready',
    meeting: {
      id: meeting.id,
      title: meeting.title,
      platform: meeting.platform,
      url: meeting.externalUrl,
      status: meeting.status,
      policy: meeting.policy,
      failureReason: meeting.failureReason,
      scheduledStart: meeting.scheduledStart,
      actualStart: meeting.actualStart,
      actualEnd: meeting.actualEnd,
      lines,
      finished: TERMINAL.has(meeting.status),
    },
  };
}
