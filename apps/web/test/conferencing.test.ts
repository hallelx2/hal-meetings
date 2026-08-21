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

  it('detects Zoom and Teams but marks them not joinable', () => {
    // Shown rather than hidden: "Hal can't do this one yet" is a different
    // message from "Hal saw nothing", and only one of them is true.
    const zoom = detectConferencing({ location: 'https://acme.zoom.us/j/98765432' });
    expect(zoom).toEqual({
      platform: 'zoom',
      url: 'https://acme.zoom.us/j/98765432',
      joinable: false,
    });

    const teams = detectConferencing({
      description: 'Join here: https://teams.microsoft.com/l/meetup-join/19%3ameeting_abc',
    });
    expect(teams?.platform).toBe('teams');
    expect(teams?.joinable).toBe(false);
  });

  it('handles a plain zoom.us host as well as a vanity subdomain', () => {
    expect(detectConferencing({ location: 'https://zoom.us/j/123' })?.platform).toBe('zoom');
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
