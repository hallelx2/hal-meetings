import { describe, expect, it } from 'bun:test';
import { LocalKms, createEnvelopeService } from '@hal/crypto';
import type { JobRow, MeetingRow, NewJobRow, NewMeetingRow, UserRow, WorkspaceRow } from '@hal/db';
import { enqueueJoinMeeting, parseMeetUrl, type JoinStore } from '../src/server/join-meeting';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function memoryJoinStore(user: UserRow): JoinStore & { meetingRows: MeetingRow[]; jobRows: JobRow[] } {
  const meetingRows: MeetingRow[] = [];
  const jobRows: JobRow[] = [];
  const workspaces: WorkspaceRow[] = [];
  return {
    meetingRows,
    jobRows,
    users: {
      async findByEmail(email) {
        return email === user.email ? user : null;
      },
    },
    workspaces: {
      async findForUser(userId) {
        return workspaces.find((w) => w.id === `ws-${userId}`) ?? null;
      },
      async createPersonal(input) {
        const row: WorkspaceRow = {
          id: `ws-${input.userId}`,
          name: input.name,
          plan: 'personal',
          featureFlags: {},
          dekWrapped: input.dekWrapped,
          dekKmsKeyId: input.dekKmsKeyId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        workspaces.push(row);
        return row;
      },
    },
    meetings: {
      async create(input: NewMeetingRow) {
        const row: MeetingRow = {
          id: crypto.randomUUID(),
          workspaceId: input.workspaceId,
          userId: input.userId,
          platform: input.platform,
          externalUrl: input.externalUrl ?? null,
          externalEventId: input.externalEventId ?? null,
          title: input.title ?? null,
          scheduledStart: input.scheduledStart ?? null,
          scheduledEnd: input.scheduledEnd ?? null,
          actualStart: null,
          actualEnd: null,
          policy: input.policy ?? 'ask',
          mode: input.mode ?? 'listen',
          status: input.status ?? 'scheduled',
          failureReason: null,
          metadata: input.metadata ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        meetingRows.push(row);
        return row;
      },
    },
    jobs: {
      async enqueue(input: NewJobRow) {
        const row: JobRow = {
          id: crypto.randomUUID(),
          workspaceId: input.workspaceId ?? null,
          userId: input.userId ?? null,
          kind: input.kind,
          status: input.status ?? 'pending',
          payloadCt: input.payloadCt,
          resultCt: null,
          errorMessage: null,
          priority: input.priority ?? 0,
          retryCount: 0,
          maxRetries: 3,
          scheduledFor: input.scheduledFor ?? new Date(),
          claimedAt: null,
          claimedBy: null,
          startedAt: null,
          finishedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        jobRows.push(row);
        return row;
      },
    },
  };
}

describe('parseMeetUrl', () => {
  it('accepts a canonical Meet link', () => {
    expect(parseMeetUrl('https://meet.google.com/abc-defg-hij')).toBe(
      'https://meet.google.com/abc-defg-hij',
    );
  });

  it('rejects zoom, http, and junk', () => {
    expect(parseMeetUrl('https://zoom.us/j/123')).toBeNull();
    expect(parseMeetUrl('http://meet.google.com/abc-defg-hij')).toBeNull();
    expect(parseMeetUrl('javascript:alert(1)')).toBeNull();
    expect(parseMeetUrl('')).toBeNull();
  });
});

describe('enqueueJoinMeeting', () => {
  it('creates a meeting and an encrypted join_meeting job', async () => {
    const master = toHex(crypto.getRandomValues(new Uint8Array(32)));
    const envelope = createEnvelopeService(new LocalKms({ masterKeyHex: master }));
    const dek = await envelope.generateUserDek();
    const user: UserRow = {
      id: crypto.randomUUID(),
      email: 'founder@hallelx2.com',
      name: 'Hal',
      dekWrapped: dek.wrappedDek,
      dekKmsKeyId: dek.keyId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const store = memoryJoinStore(user);
    const result = await enqueueJoinMeeting({
      store,
      envelope,
      user,
      url: 'https://meet.google.com/abc-defg-hij',
    });
    expect(store.meetingRows).toHaveLength(1);
    expect(store.jobRows).toHaveLength(1);
    expect(store.jobRows[0]!.kind).toBe('join_meeting');
    expect(store.jobRows[0]!.status).toBe('pending');
    expect(result.meetingId).toBe(store.meetingRows[0]!.id);
    const workspace = await store.workspaces.findForUser(user.id);
    const payload = await envelope.decryptJson<{ meetingId: string }>({
      wrappedDek: workspace!.dekWrapped,
      keyId: workspace!.dekKmsKeyId,
      ciphertext: store.jobRows[0]!.payloadCt,
    });
    expect(payload.meetingId).toBe(result.meetingId);
  });

  it('rejects an invalid url before insert', async () => {
    const master = toHex(crypto.getRandomValues(new Uint8Array(32)));
    const envelope = createEnvelopeService(new LocalKms({ masterKeyHex: master }));
    const dek = await envelope.generateUserDek();
    const user: UserRow = {
      id: crypto.randomUUID(),
      email: 'a@example.com',
      name: 'A',
      dekWrapped: dek.wrappedDek,
      dekKmsKeyId: dek.keyId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const store = memoryJoinStore(user);
    await expect(
      enqueueJoinMeeting({ store, envelope, user, url: 'https://zoom.us/j/1' }),
    ).rejects.toThrow('invalid_meet_url');
    expect(store.jobRows).toHaveLength(0);
    expect(store.meetingRows).toHaveLength(0);
  });
});
