/**
 * What Hal does for one meeting, and how far along it is.
 *
 * The stage list is not marketing copy — it is `runMeetingSession` in
 * `apps/agent/src/pipeline/meeting-session.ts`, in order. Keeping the two in
 * step matters more than the wording: this panel is the only place the operator
 * finds out what the agent is going to do on their behalf, and a list that
 * describes a pipeline the code does not have is worse than no list.
 *
 * Nothing here invents content. A meeting Hal has never attended shows a plan
 * with every stage pending, never a plausible-looking summary.
 */

import { hasEnded, isLive, type CalendarEntry } from '@/module/dashboard/calendar';

export type StageState = 'done' | 'active' | 'pending' | 'blocked';

export type HalStage = {
  key: string;
  title: string;
  detail: string;
  state: StageState;
};

export type HalPosture =
  /** Hal cannot attend this one at all. */
  | 'blocked'
  /** Hal could attend but has not been asked to. */
  | 'unbooked'
  /** It is over, and Hal was not in it. Nothing can be done about it now. */
  | 'missed'
  /** A run that started and never reported back. */
  | 'stalled'
  /** Hal is going. */
  | 'booked'
  | 'joining'
  | 'live'
  | 'done'
  | 'failed';

export type HalPlan = {
  posture: HalPosture;
  headline: string;
  /** The one-line why, when Hal is not attending or something went wrong. */
  reason: string | null;
  /** True when this meeting has a working "send Hal" action. */
  sendable: boolean;
  stages: HalStage[];
};

/** The pipeline, in the order the agent runs it. */
const STAGES: ReadonlyArray<Omit<HalStage, 'state'>> = [
  {
    key: 'join',
    title: 'Join the call',
    detail:
      'Opens the meeting in a browser of its own and waits in the lobby until someone admits the guest named Hal.',
  },
  {
    key: 'disclose',
    title: 'Announce itself',
    detail:
      'Posts a line in the meeting chat, so nobody in the room is recorded without being told.',
  },
  {
    key: 'capture',
    title: 'Capture the audio',
    detail:
      'Records what the call plays into its own browser. Your microphone and your machine are never touched.',
  },
  {
    key: 'transcribe',
    title: 'Transcribe as it goes',
    detail: 'Streams the audio to speech-to-text while the meeting runs, rather than after it.',
  },
  {
    key: 'summarise',
    title: 'Summarise and pull out the actions',
    detail: 'Writes the summary and extracts the action items once the call ends.',
  },
  {
    key: 'store',
    title: 'Encrypt, then store',
    detail:
      'Encrypts the transcript, summary and actions with your workspace key before any of it reaches the database.',
  },
  {
    key: 'email',
    title: 'Email you the write-up',
    detail: 'Sends the summary to your inbox, so you never have to come back here for it.',
  },
];

const PLATFORM_LABELS: Record<string, string> = {
  zoom: 'Zoom',
  teams: 'Microsoft Teams',
  meet: 'Google Meet',
};

function withStates(states: StageState[]): HalStage[] {
  return STAGES.map((stage, index) => ({ ...stage, state: states[index] ?? 'pending' }));
}

function every(state: StageState): StageState[] {
  return STAGES.map(() => state);
}

/**
 * Why Hal will not attend, or null if nothing stands in the way.
 *
 * Order is deliberate: the most specific and most actionable reason wins. A
 * cancelled meeting with no link should say it was cancelled, because that is
 * the fact that explains the other one.
 */
function blockedReason(entry: CalendarEntry): string | null {
  if (entry.status === 'cancelled') return 'This meeting was cancelled.';
  if (entry.policy === 'ignore') return 'You told Hal to skip this meeting.';
  if (!entry.url) return 'This event has no meeting link, so there is nothing to join.';
  if (entry.platform && entry.platform !== 'meet') {
    return `Hal does not join ${PLATFORM_LABELS[entry.platform] ?? entry.platform} yet — Google Meet only, for now.`;
  }
  if (!entry.joinable) return 'Hal does not recognise this meeting link.';
  return null;
}

/**
 * A run that was mid-flight when the meeting ended and never came back.
 *
 * Left alone, `status` sticks at 'joining' or 'in-progress' forever and the
 * panel keeps announcing that Hal is in a call that finished days ago. Saying
 * nothing was reported is the only claim that is actually supported.
 *
 * `confirmed` is how many stages the status still evidences: 'in-progress' is
 * only ever written after the agent has joined and disclosed, so those two
 * genuinely happened. Everything from there on is unknown, which is not the
 * same as pending — nothing is going to advance it now.
 */
function stalled(confirmed: number): HalPlan {
  return {
    posture: 'stalled',
    headline: 'Hal never reported back from this meeting.',
    reason:
      'The meeting has ended while the run was still mid-flight, so there may be no recording and no summary.',
    sendable: false,
    stages: withStates(STAGES.map((_, index) => (index < confirmed ? 'done' : 'blocked'))),
  };
}

export function halPlan(entry: CalendarEntry, now: Date): HalPlan {
  const blocked = blockedReason(entry);
  if (blocked) {
    return {
      posture: 'blocked',
      headline: 'Hal is sitting this one out.',
      reason: blocked,
      sendable: false,
      stages: withStates(every('blocked')),
    };
  }

  // Everything below turns on whether the meeting is still ahead. Offering to
  // send Hal into a call that finished last month is the specific nonsense this
  // guards: the action is impossible, and printing it invites the user to try.
  const ended = hasEnded(entry, now);

  switch (entry.status) {
    case 'completed':
      return {
        posture: 'done',
        headline: 'Hal attended. The write-up is encrypted in your workspace.',
        reason: null,
        sendable: false,
        stages: withStates(every('done')),
      };

    case 'failed':
      return {
        posture: 'failed',
        headline: 'Hal could not finish this meeting.',
        // Never paraphrased. If the agent recorded no reason, say that rather
        // than guessing at one — a made-up cause sends the operator looking in
        // the wrong place.
        reason: entry.failureReason ?? 'The agent did not record a reason.',
        // Retrying is only meaningful while there is still a call to join.
        sendable: !ended,
        stages: withStates(every('blocked')),
      };

    case 'in-progress':
      // 'in-progress' is only written once the agent has joined and disclosed.
      if (ended) return stalled(2);
      return {
        posture: 'live',
        headline: 'Hal is in this meeting right now.',
        reason: null,
        sendable: false,
        stages: withStates(['done', 'done', 'active', 'active', 'pending', 'pending', 'pending']),
      };

    case 'joining':
      // 'joining' evidences nothing beyond an attempt.
      if (ended) return stalled(0);
      return {
        posture: 'joining',
        headline: 'Hal is joining — admit the guest named Hal in the lobby.',
        reason: null,
        sendable: false,
        stages: withStates(['active', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending']),
      };

    default:
      break;
  }

  // Scheduled, or a calendar event Hal has no row for at all. The distinction
  // that matters here is `policy`: calendar sync files every joinable event as
  // 'ask', which means Hal will *not* turn up unless it is sent. Showing "Hal
  // can join" — a statement about capability — where the operator reads it as
  // a commitment is the single most misleading thing this screen could do.
  if (ended) {
    return {
      posture: 'missed',
      headline: 'This meeting has already ended, and Hal was not in it.',
      reason:
        entry.policy === 'auto'
          ? 'Hal was booked for this one but never ran, so nothing was recorded.'
          : 'It finished before Hal was sent, so there is no recording and no summary.',
      // Nothing to join. A button here would be an invitation to try something
      // that cannot work.
      sendable: false,
      stages: withStates(every('blocked')),
    };
  }

  if (entry.policy === 'auto') {
    return {
      posture: 'booked',
      headline: isLive(entry, now)
        ? 'Hal is due in this meeting.'
        : 'Hal will join this meeting.',
      reason: null,
      sendable: false,
      stages: withStates(every('pending')),
    };
  }

  return {
    posture: 'unbooked',
    headline: isLive(entry, now)
      ? 'Hal is not in this meeting — it is running now.'
      : 'Hal is not booked for this one.',
    reason: 'Calendar meetings are opt-in. Send Hal and it joins; otherwise it stays out.',
    sendable: true,
    stages: withStates(every('pending')),
  };
}

/**
 * The plan for a meeting Hal has a row for, driven by that row's real status.
 *
 * `halPlan` above answers "what will Hal do about this calendar event", where
 * the status is usually absent and the clock does most of the work. This
 * answers "what is Hal doing about this meeting right now", from the status the
 * worker has actually written.
 *
 * Both read the same STAGES, so the dashboard and the meeting page cannot
 * describe the pipeline differently — which they would within a week if the
 * list were written twice.
 */
export function planForMeeting(input: {
  status: string;
  policy?: string | null;
  failureReason?: string | null;
}): HalPlan {
  switch (input.status) {
    case 'completed':
      return {
        posture: 'done',
        headline: 'Hal attended. The write-up is encrypted in your workspace.',
        reason: null,
        sendable: false,
        stages: withStates(every('done')),
      };

    case 'failed':
      return {
        posture: 'failed',
        headline: 'Hal could not finish this meeting.',
        // Verbatim. Every failure this week was diagnosed from a container log
        // the user could not see; the agent's own words belong on the screen.
        reason: input.failureReason ?? 'The agent did not record a reason.',
        sendable: true,
        stages: withStates(every('blocked')),
      };

    case 'cancelled':
      return {
        posture: 'blocked',
        headline: 'This meeting was cancelled.',
        reason: null,
        sendable: false,
        stages: withStates(every('blocked')),
      };

    case 'in-progress':
      return {
        posture: 'live',
        headline: 'Hal is in this meeting right now.',
        reason: null,
        sendable: false,
        stages: withStates(['done', 'done', 'active', 'active', 'pending', 'pending', 'pending']),
      };

    case 'joining':
      return {
        posture: 'joining',
        headline: 'Hal is joining — let it in when it asks.',
        reason: null,
        sendable: false,
        stages: withStates([
          'active',
          'pending',
          'pending',
          'pending',
          'pending',
          'pending',
          'pending',
        ]),
      };

    default:
      return {
        posture: input.policy === 'auto' ? 'booked' : 'unbooked',
        headline:
          input.policy === 'auto'
            ? 'Hal is queued for this meeting.'
            : 'Hal is not booked for this one.',
        reason: null,
        sendable: input.policy !== 'auto',
        stages: withStates(every('pending')),
      };
  }
}
