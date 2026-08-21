import { describe, expect, it } from 'bun:test';
import { detectConferencing } from '../src/lib/conferencing';

describe('detectConferencing', () => {
  it('finds a Meet link in hangoutLink and marks it joinable', () => {
    expect(detectConferencing({ hangoutLink: 'https://meet.google.com/abc-defg-hij' })).toEqual({
      platform: 'meet',
      url: 'https://meet.google.com/abc-defg-hij',
      joinable: true,
    });
  });

  it('finds a Meet link in conferenceData video entry points', () => {
    const found = detectConferencing({
      conferenceData: {
        entryPoints: [
          { entryPointType: 'phone', uri: 'tel:+441234567890' },
          { entryPointType: 'video', uri: 'https://meet.google.com/xyz-1234-abc' },
        ],
      },
    });
    expect(found?.platform).toBe('meet');
    expect(found?.url).toBe('https://meet.google.com/xyz-1234-abc');
  });

  it('never returns a dial-in as the conference URL', () => {
    // A phone entry point is a real conference, but not one a browser can join.
    expect(
      detectConferencing({
        conferenceData: { entryPoints: [{ entryPointType: 'phone', uri: 'tel:+441234567890' }] },
      }),
    ).toBeNull();
  });

  it('marks a well-formed Zoom link joinable', () => {
    const zoom = detectConferencing({ location: 'https://acme.zoom.us/j/98765432109' });
    expect(zoom).toEqual({
      platform: 'zoom',
      url: 'https://acme.zoom.us/j/98765432109',
      joinable: true,
    });
  });

  it('still detects Teams, and still cannot join it', () => {
    // Shown rather than hidden: "Hal can't do this one yet" is a different
    // message from "Hal saw nothing", and only one of them is true.
    const teams = detectConferencing({
      description: 'Join here: https://teams.microsoft.com/l/meetup-join/19%3ameeting_abc',
    });
    expect(teams?.platform).toBe('teams');
    expect(teams?.joinable).toBe(false);
  });

  it('detects a malformed Zoom link but does not promise to join it', () => {
    // The badge and the joiner read the same parser. A short meeting ID is
    // still recognisably Zoom — worth showing — but the joiner would reject
    // it, so the badge must not claim otherwise.
    const short = detectConferencing({ location: 'https://zoom.us/j/123' });
    expect(short?.platform).toBe('zoom');
    expect(short?.joinable).toBe(false);
  });

  it('handles a plain zoom.us host as well as a vanity subdomain', () => {
    expect(detectConferencing({ location: 'https://zoom.us/j/91234567890' })?.platform).toBe('zoom');
  });

  it('prefers the structured field over free text', () => {
    // The description mentions a different call — someone pasting a reference,
    // or a stale link from a copied invite. The structured field is the event's
    // own conference and must win.
    const found = detectConferencing({
      hangoutLink: 'https://meet.google.com/real-meet-ing',
      description: 'Previously we used https://acme.zoom.us/j/00000',
    });
    expect(found?.platform).toBe('meet');
    expect(found?.url).toBe('https://meet.google.com/real-meet-ing');
  });

  it('returns null for an event with no conference at all', () => {
    expect(
      detectConferencing({ location: 'Meeting room 3', description: 'Bring the printouts' }),
    ).toBeNull();
    expect(detectConferencing({})).toBeNull();
  });

  it('does not swallow punctuation belonging to the sentence', () => {
    // These links live mid-prose in a description far more often than alone.
    expect(detectConferencing({ description: 'Join https://acme.zoom.us/j/98765432.' })?.url).toBe(
      'https://acme.zoom.us/j/98765432',
    );
    expect(
      detectConferencing({ description: 'Dial https://acme.zoom.us/j/98765432, or call in' })?.url,
    ).toBe('https://acme.zoom.us/j/98765432');
    expect(
      detectConferencing({ description: 'Zoom (https://acme.zoom.us/j/98765432)' })?.url,
    ).toBe('https://acme.zoom.us/j/98765432');
  });

  it('keeps balanced brackets that belong to the URL', () => {
    expect(
      detectConferencing({
        description: 'https://teams.microsoft.com/l/meetup-join/a(b)c',
      })?.url,
    ).toBe('https://teams.microsoft.com/l/meetup-join/a(b)c');
  });

  it('matches regardless of host case', () => {
    expect(detectConferencing({ hangoutLink: 'https://MEET.GOOGLE.COM/abc-defg-hij' })?.platform).toBe(
      'meet',
    );
  });

  it('takes the first link when a description lists several', () => {
    const found = detectConferencing({
      description: 'https://acme.zoom.us/j/111 and https://acme.zoom.us/j/222',
    });
    expect(found?.url).toBe('https://acme.zoom.us/j/111');
  });

  it('does not choke on nulls from the API', () => {
    expect(
      detectConferencing({
        hangoutLink: null,
        location: null,
        description: null,
        conferenceData: null,
      }),
    ).toBeNull();
  });
});
