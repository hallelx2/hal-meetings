import { describe, expect, it } from 'bun:test';
import {
  CALENDAR_SCOPES,
  GOOGLE_SCOPES,
  IDENTITY_SCOPES,
  hasCalendarAccess,
  resolveGrantedScopes,
} from '../src/lib/google-scopes';

describe('scope split', () => {
  it('keeps calendar out of what sign-in asks for', () => {
    // The whole point of the split: a first-time consent screen must not
    // mention the calendar.
    for (const scope of IDENTITY_SCOPES) {
      expect(scope).not.toContain('calendar');
    }
  });

  it('asks only for read access to the calendar', () => {
    // Hal reads the calendar to know what to join. It has no business writing
    // to it, and a write scope slipping in here would be invisible until a
    // user read the consent screen carefully.
    for (const scope of CALENDAR_SCOPES) {
      expect(scope).toContain('calendar');
      expect(scope).toContain('readonly');
    }
  });

  it('composes the full grant from both halves with no duplicates', () => {
    expect(GOOGLE_SCOPES).toEqual([...IDENTITY_SCOPES, ...CALENDAR_SCOPES]);
    expect(new Set(GOOGLE_SCOPES).size).toBe(GOOGLE_SCOPES.length);
  });
});

describe('resolveGrantedScopes', () => {
  // The rule that is easy to get backwards, and was: when the provider tells us
  // nothing, assume the least access. Recording calendar we do not have hides
  // the connect prompt and strands the user.
  it('falls back to identity, never the full grant, when scope is missing', () => {
    for (const raw of [null, undefined, '', '   ']) {
      const resolved = resolveGrantedScopes(raw);
      expect(resolved).toEqual([...IDENTITY_SCOPES]);
      expect(hasCalendarAccess(resolved)).toBe(false);
    }
  });

  it('splits on spaces and commas', () => {
    expect(resolveGrantedScopes('openid email profile')).toEqual([
      'openid',
      'email',
      'profile',
    ]);
    expect(resolveGrantedScopes('openid,email,profile')).toEqual([
      'openid',
      'email',
      'profile',
    ]);
  });

  it('preserves a real calendar grant', () => {
    expect(hasCalendarAccess(resolveGrantedScopes(GOOGLE_SCOPES.join(' ')))).toBe(true);
  });

  it('does not invent calendar access from an identity-only grant', () => {
    // The exact regression: an identity-only sign-in whose account row carries
    // no scope must not come back looking calendar-connected.
    expect(hasCalendarAccess(resolveGrantedScopes(IDENTITY_SCOPES.join(' ')))).toBe(false);
  });
});

describe('hasCalendarAccess', () => {
  it('is false for a fresh sign-in that granted identity only', () => {
    // The state every user is in immediately after signing in. Getting this
    // wrong hides the connect prompt and strands them.
    expect(hasCalendarAccess([...IDENTITY_SCOPES])).toBe(false);
  });

  it('is false with no scopes at all', () => {
    expect(hasCalendarAccess([])).toBe(false);
  });

  it('is true once the full grant is stored', () => {
    expect(hasCalendarAccess([...GOOGLE_SCOPES])).toBe(true);
  });

  it('is false when only part of the calendar grant came back', () => {
    // Google lets a user untick individual scopes on the consent screen, so a
    // partial grant is a real state, not a hypothetical one.
    expect(hasCalendarAccess([...IDENTITY_SCOPES, CALENDAR_SCOPES[0]])).toBe(false);
  });

  it('ignores unrelated extra scopes', () => {
    expect(
      hasCalendarAccess([
        ...GOOGLE_SCOPES,
        'https://www.googleapis.com/auth/gmail.readonly',
      ]),
    ).toBe(true);
  });

  it('does not treat a lookalike scope as calendar access', () => {
    expect(
      hasCalendarAccess([
        ...IDENTITY_SCOPES,
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ]),
    ).toBe(false);
  });
});
