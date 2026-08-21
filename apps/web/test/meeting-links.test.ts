import { describe, expect, it } from 'bun:test';
import {
  DEFAULT_BOT_NAME_TEMPLATE,
  parseJoinableUrl,
  parseMeetUrl,
  parseZoomUrl,
  renderBotName,
} from '@hal/meeting-links';

describe('parseZoomUrl', () => {
  it('reads a standard invitation link', () => {
    const link = parseZoomUrl('https://us02web.zoom.us/j/88123456789?pwd=Ab1Cd2Ef3');
    expect(link).toMatchObject({
      meetingId: '88123456789',
      pwd: 'Ab1Cd2Ef3',
      host: 'us02web.zoom.us',
    });
  });

  it('rewrites /j/ to the web client, keeping the passcode', () => {
    // The /j/ link is a launcher whose job is to hand off to the desktop app.
    // Navigating there means fighting a page designed to send you elsewhere.
    const link = parseZoomUrl('https://us02web.zoom.us/j/88123456789?pwd=Ab1Cd2Ef3');
    expect(link?.webClientUrl).toBe('https://us02web.zoom.us/wc/join/88123456789?pwd=Ab1Cd2Ef3');
  });

  it('keeps the vanity subdomain rather than normalising to zoom.us', () => {
    // acme.zoom.us and zoom.us are different hosts to Zoom; rewriting the host
    // produces a link that does not resolve to the meeting.
    expect(parseZoomUrl('https://acme.zoom.us/j/91234567890')?.webClientUrl).toBe(
      'https://acme.zoom.us/wc/join/91234567890',
    );
  });

  it('accepts a bare zoom.us host', () => {
    expect(parseZoomUrl('https://zoom.us/j/91234567890')?.host).toBe('zoom.us');
  });

  it('accepts the web-client forms it might be handed back', () => {
    expect(parseZoomUrl('https://us02web.zoom.us/wc/join/88123456789')?.meetingId).toBe(
      '88123456789',
    );
    expect(parseZoomUrl('https://us02web.zoom.us/wc/88123456789/join')?.meetingId).toBe(
      '88123456789',
    );
  });

  it('accepts start and webinar links', () => {
    expect(parseZoomUrl('https://zoom.us/s/91234567890')?.meetingId).toBe('91234567890');
    expect(parseZoomUrl('https://zoom.us/w/91234567890')?.meetingId).toBe('91234567890');
  });

  it('omits pwd from the web client URL when the link had none', () => {
    expect(parseZoomUrl('https://zoom.us/j/91234567890')?.webClientUrl).toBe(
      'https://zoom.us/wc/join/91234567890',
    );
  });

  it('rejects a personal-link room', () => {
    // /my/name resolves to a room whose numeric ID is not in the URL, so there
    // is nothing to join with. Failing here beats navigating and timing out.
    expect(parseZoomUrl('https://zoom.us/my/halleluyah')).toBeNull();
  });

  it('rejects non-Zoom hosts, including lookalikes', () => {
    expect(parseZoomUrl('https://zoom.us.evil.com/j/91234567890')).toBeNull();
    expect(parseZoomUrl('https://notzoom.us/j/91234567890')).toBeNull();
    expect(parseZoomUrl('https://meet.google.com/abc-defg-hij')).toBeNull();
  });

  it('rejects http', () => {
    expect(parseZoomUrl('http://zoom.us/j/91234567890')).toBeNull();
  });

  it('rejects a meeting id that is not 9 to 11 digits', () => {
    expect(parseZoomUrl('https://zoom.us/j/12345')).toBeNull();
    expect(parseZoomUrl('https://zoom.us/j/123456789012')).toBeNull();
    expect(parseZoomUrl('https://zoom.us/j/abcdefghi')).toBeNull();
  });

  it('rejects junk', () => {
    expect(parseZoomUrl('')).toBeNull();
    expect(parseZoomUrl('not a url')).toBeNull();
  });
});

describe('parseMeetUrl', () => {
  it('normalises case and strips extra path', () => {
    expect(parseMeetUrl('https://meet.google.com/ABC-DEFG-HIJ')?.joinUrl).toBe(
      'https://meet.google.com/abc-defg-hij',
    );
  });

  it('rejects a Meet URL that is not a meeting code', () => {
    expect(parseMeetUrl('https://meet.google.com/lookup/abcdefg')).toBeNull();
  });
});

describe('parseJoinableUrl', () => {
  it('routes Meet and Zoom to their own platforms', () => {
    expect(parseJoinableUrl('https://meet.google.com/abc-defg-hij')?.platform).toBe('meet');
    expect(parseJoinableUrl('https://zoom.us/j/91234567890')?.platform).toBe('zoom');
  });

  it('separates the URL to show from the URL to navigate to', () => {
    // Storing the web-client URL would show the user a link they do not
    // recognise; navigating to the /j/ link hits the app launcher. Both are
    // needed, and they are not the same string.
    const zoom = parseJoinableUrl('https://zoom.us/j/91234567890');
    expect(zoom?.url).toBe('https://zoom.us/j/91234567890');
    expect(zoom?.navigateUrl).toBe('https://zoom.us/wc/join/91234567890');
  });

  it('leaves Meet URLs identical on both fields', () => {
    const meet = parseJoinableUrl('https://meet.google.com/abc-defg-hij');
    expect(meet?.url).toBe(meet?.navigateUrl);
  });

  it('returns null for Teams, which is still not joinable', () => {
    expect(parseJoinableUrl('https://teams.microsoft.com/l/meetup-join/19%3ameeting_abc')).toBeNull();
  });
});

describe('renderBotName', () => {
  it('puts the user in the name by default', () => {
    // The host decides on the name alone — the disclosure cannot be posted
    // until after admission — so an anonymous "Hal · AI" is asking to be
    // declined.
    expect(DEFAULT_BOT_NAME_TEMPLATE).toContain('{{user}}');
    expect(renderBotName(DEFAULT_BOT_NAME_TEMPLATE, 'Halleluyah')).toBe(
      'Hal · AI for Halleluyah',
    );
  });

  it('falls back to the first name before it truncates characters', () => {
    const long = renderBotName(DEFAULT_BOT_NAME_TEMPLATE, 'Halleluyah Darasimi Oludele', 30);
    expect(long).toBe('Hal · AI for Halleluyah');
    expect(long).not.toContain('…');
  });

  it('hard-truncates only when even the first name will not fit', () => {
    const out = renderBotName(DEFAULT_BOT_NAME_TEMPLATE, 'Bartholomewlongname', 20);
    expect(out.length).toBeLessThanOrEqual(20);
  });

  it('does not leave a dangling separator when there is no user name', () => {
    expect(renderBotName('Hal · AI for {{user}}', null).trim()).toBe('Hal · AI for');
    expect(renderBotName('Hal · AI for {{user}}', '   ').trim()).toBe('Hal · AI for');
  });

  it('leaves a template with no placeholder alone', () => {
    expect(renderBotName('Recording Bot', 'Halleluyah')).toBe('Recording Bot');
  });
});
