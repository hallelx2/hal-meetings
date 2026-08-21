import 'server-only';

import type { EnvelopeService } from '@hal/crypto';
import type { OauthTokenRow, Repositories, UserRow } from '@hal/db';
import { detectConferencing, type CalendarEventLike } from '@/lib/conferencing';
import { hasCalendarAccess } from '@/lib/google-scopes';

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const EVENTS_ENDPOINT =
  'https://www.googleapis.com/calendar/v3/calendars/primary/events';

/** Refresh a little early — a token that expires mid-request is a failed sync. */
const EXPIRY_SKEW_MS = 60_000;

export class CalendarNotConnectedError extends Error {
  constructor() {
    super('Google Calendar is not connected for this user');
    this.name = 'CalendarNotConnectedError';
  }
}

/** The grant was revoked or expired at Google. Only the user can fix it. */
export class CalendarReauthRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalendarReauthRequiredError';
  }
}

export type GoogleCalendarEvent = CalendarEventLike & {
  id: string;
  status?: string | null;
  summary?: string | null;
  start?: { dateTime?: string | null; date?: string | null } | null;
  end?: { dateTime?: string | null; date?: string | null } | null;
  attendees?: Array<{
    email?: string | null;
    responseStatus?: string | null;
    self?: boolean | null;
    organizer?: boolean | null;
  }> | null;
  organizer?: { email?: string | null; displayName?: string | null } | null;
  /** The event's own page on Google Calendar. */
  htmlLink?: string | null;
};

type Deps = {
  store: Pick<Repositories, 'oauthTokens' | 'meetings'>;
  envelope: EnvelopeService;
  user: UserRow;
  workspaceId: string;
};

/**
 * Exchange the stored refresh token for a usable access token.
 *
 * Hal does this itself rather than leaning on Better Auth's `getAccessToken`,
 * because the OAuth callback hook deliberately nulls Better Auth's plaintext
 * token columns — the only copy that survives is the ciphertext in
 * `oauth_tokens`, encrypted with the user's DEK. Better Auth has nothing left
 * to refresh with, and that is the intended design, not an oversight.
 */
async function accessTokenFor(deps: Deps, token: OauthTokenRow): Promise<string> {
  const notExpired =
    token.expiresAt && token.expiresAt.getTime() - EXPIRY_SKEW_MS > Date.now();

  if (notExpired) {
    return deps.envelope.decryptString({
      wrappedDek: deps.user.dekWrapped,
      keyId: deps.user.dekKmsKeyId,
      ciphertext: token.accessTokenCt,
    });
  }

  if (!token.refreshTokenCt) {
    // Google only issues a refresh token when consent is forced. Without one
    // there is nothing to renew from, and the user has to reconnect.
    throw new CalendarReauthRequiredError(
      'No refresh token stored for Google. Reconnect Google Calendar.',
    );
  }

  const refreshToken = await deps.envelope.decryptString({
    wrappedDek: deps.user.dekWrapped,
    keyId: deps.user.dekKmsKeyId,
    ciphertext: token.refreshTokenCt,
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    // invalid_grant means revoked, expired, or the user changed their password.
    // No amount of retrying fixes it — surface it so the UI can say "reconnect".
    if (body.includes('invalid_grant')) {
      throw new CalendarReauthRequiredError('Google rejected the refresh token.');
    }
    throw new Error(`Google token refresh failed (${response.status})`);
  }

  const payload = (await response.json()) as {
    access_token: string;
    expires_in?: number;
    refresh_token?: string;
  };

  const expiresAt = new Date(Date.now() + (payload.expires_in ?? 3600) * 1000);

  // Persist the fresh access token so the next request does not refresh again.
  // Google usually omits refresh_token on renewal; keep the existing one when
  // it does, or the next refresh has nothing to work from.
  await deps.store.oauthTokens.upsert({
    workspaceId: deps.workspaceId,
    userId: deps.user.id,
    provider: 'google',
    providerAccountId: token.providerAccountId,
    accessTokenCt: await deps.envelope.encryptString({
      wrappedDek: deps.user.dekWrapped,
      keyId: deps.user.dekKmsKeyId,
      plaintext: payload.access_token,
    }),
    refreshTokenCt: payload.refresh_token
      ? await deps.envelope.encryptString({
          wrappedDek: deps.user.dekWrapped,
          keyId: deps.user.dekKmsKeyId,
          plaintext: payload.refresh_token,
        })
      : token.refreshTokenCt,
    expiresAt,
    scopes: token.scopes,
  });

  return payload.access_token;
}

/**
 * Fetch events in a window from the user's primary calendar.
 *
 * Returns the calendar's own `timeZone` alongside the events. That zone — not
 * the server's, not the browser's — is the one the user thinks in, and every
 * rendered time has to be formatted with it or the two ends disagree.
 */
export async function fetchCalendarEvents(
  deps: Deps,
  window: { from: Date; to: Date },
): Promise<{ events: GoogleCalendarEvent[]; timeZone: string | null }> {
  const tokens = await deps.store.oauthTokens.findForUser(deps.user.id, 'google');
  const token = tokens.find((row) => hasCalendarAccess(row.scopes ?? []));
  if (!token) throw new CalendarNotConnectedError();

  const accessToken = await accessTokenFor(deps, token);

  const url = new URL(EVENTS_ENDPOINT);
  url.searchParams.set('timeMin', window.from.toISOString());
  url.searchParams.set('timeMax', window.to.toISOString());
  // Expand recurring events into individual occurrences — a weekly standup
  // must appear on each of its days, not once as a rule nobody can act on.
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '250');

  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });

  if (response.status === 401 || response.status === 403) {
    throw new CalendarReauthRequiredError('Google refused the calendar request.');
  }
  if (!response.ok) {
    throw new Error(`Google Calendar request failed (${response.status})`);
  }

  const payload = (await response.json()) as {
    items?: GoogleCalendarEvent[];
    timeZone?: string | null;
  };
  return { events: payload.items ?? [], timeZone: payload.timeZone ?? null };
}

export type SyncedMeeting = {
  event: GoogleCalendarEvent;
  start: Date;
  end: Date | null;
  conferencing: ReturnType<typeof detectConferencing>;
};

/** Timed events only — an all-day row has no `dateTime` and nothing to join. */
export function toSyncedMeeting(event: GoogleCalendarEvent): SyncedMeeting | null {
  if (event.status === 'cancelled') return null;
  const startIso = event.start?.dateTime;
  if (!startIso) return null;

  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return null;

  const endIso = event.end?.dateTime;
  const end = endIso ? new Date(endIso) : null;

  return {
    event,
    start,
    end: end && !Number.isNaN(end.getTime()) ? end : null,
    conferencing: detectConferencing(event),
  };
}

/**
 * Sync a window of the user's calendar into `meetings`.
 *
 * Only joinable events become rows. A Zoom invite is worth showing on the
 * dashboard, but writing it to `meetings` would put work in front of a worker
 * that cannot do it — the dashboard reads those straight from the calendar
 * instead.
 */
export async function syncCalendarWindow(
  deps: Deps,
  window: { from: Date; to: Date },
): Promise<{ events: SyncedMeeting[]; synced: number; timeZone: string | null }> {
  const raw = await fetchCalendarEvents(deps, window);
  const events = raw.events.map(toSyncedMeeting).filter((m): m is SyncedMeeting => m !== null);

  // Read the window's existing rows once and index them, rather than a lookup
  // per event. A busy week is otherwise ~2N sequential round trips on a page
  // render, and this runs on every dashboard load.
  const existingRows = await deps.store.meetings.listInWindow({
    userId: deps.user.id,
    from: window.from,
    to: window.to,
  });
  const byEventId = new Map(
    existingRows
      .filter((row) => row.externalEventId && row.platform === 'meet')
      .map((row) => [row.externalEventId!, row]),
  );

  let synced = 0;
  for (const meeting of events) {
    if (!meeting.conferencing?.joinable) continue;

    const existing = byEventId.get(meeting.event.id);

    // Never clobber a meeting the agent is already working on, or the policy the
    // user chose for it. The calendar owns the schedule; Hal owns the rest.
    if (existing) {
      if (existing.status !== 'scheduled') continue;
      await deps.store.meetings.updateSchedule(existing.id, {
        title: meeting.event.summary ?? null,
        externalUrl: meeting.conferencing.url,
        scheduledStart: meeting.start,
        scheduledEnd: meeting.end,
      });
      synced += 1;
      continue;
    }

    await deps.store.meetings.create({
      workspaceId: deps.workspaceId,
      userId: deps.user.id,
      platform: 'meet',
      externalUrl: meeting.conferencing.url,
      externalEventId: meeting.event.id,
      title: meeting.event.summary ?? null,
      scheduledStart: meeting.start,
      scheduledEnd: meeting.end,
      status: 'scheduled',
      // 'ask' by default. Hal joining a meeting nobody told it to join is the
      // one failure this product cannot afford.
      policy: 'ask',
    });
    synced += 1;
  }

  return { events, synced, timeZone: raw.timeZone };
}
