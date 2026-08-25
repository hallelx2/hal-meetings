import { describe, expect, it } from 'bun:test';
import { findJoinableInText, trimTrailingPunctuation } from '@hal/meeting-links';

describe('trimTrailingPunctuation', () => {
  it('drops the sentence’s full stop, which is a hard parse failure otherwise', () => {
    // Meet codes are strictly xxx-xxxx-xxx, so a trailing dot is not a
    // near-miss — the whole link fails to parse.
    expect(trimTrailingPunctuation('https://meet.google.com/abc-defg-hij.')).toBe(
      'https://meet.google.com/abc-defg-hij',
    );
  });

  it('drops commas, colons and quotes', () => {
    expect(trimTrailingPunctuation('https://zoom.us/j/91234567890,')).toBe(
      'https://zoom.us/j/91234567890',
    );
    expect(trimTrailingPunctuation('"https://zoom.us/j/91234567890"')).toBe(
      '"https://zoom.us/j/91234567890',
    );
  });

  it('strips an unbalanced closing bracket', () => {
    expect(trimTrailingPunctuation('https://zoom.us/j/91234567890)')).toBe(
      'https://zoom.us/j/91234567890',
    );
  });

  it('keeps a bracket the URL actually owns', () => {
    // Balanced, so it belongs to the address rather than to the writer.
    expect(trimTrailingPunctuation('https://example.com/a(b)')).toBe('https://example.com/a(b)');
  });

  it('leaves a clean URL alone', () => {
    expect(trimTrailingPunctuation('https://meet.google.com/abc-defg-hij')).toBe(
      'https://meet.google.com/abc-defg-hij',
    );
  });
});

describe('findJoinableInText', () => {
  it('finds a link in the middle of a real message', () => {
    const text = 'standup moved to 3pm, join at https://meet.google.com/abc-defg-hij see you';
    expect(findJoinableInText(text)?.url).toBe('https://meet.google.com/abc-defg-hij');
  });

  it('finds a link that ends the sentence', () => {
    // The case that motivated the shared trimmer: chat messages end in
    // punctuation far more often than calendar fields do.
    const text = 'Here is the call: https://meet.google.com/abc-defg-hij.';
    expect(findJoinableInText(text)?.url).toBe('https://meet.google.com/abc-defg-hij');
  });

  it('finds a Zoom link and keeps the vanity subdomain', () => {
    const text = 'Dial in (https://acme.zoom.us/j/91234567890) at noon';
    expect(findJoinableInText(text)?.url).toBe('https://acme.zoom.us/j/91234567890');
  });

  it('takes the first joinable link, skipping ones it cannot join', () => {
    const text = 'not this https://teams.microsoft.com/l/meetup-join/19%3aabc but https://meet.google.com/abc-defg-hij';
    expect(findJoinableInText(text)?.platform).toBe('meet');
  });

  it('returns null when there is no meeting link', () => {
    expect(findJoinableInText('are we still on for 3?')).toBeNull();
    expect(findJoinableInText('read https://example.com/blog')).toBeNull();
    expect(findJoinableInText('')).toBeNull();
  });

  it('is not fooled by a lookalike host in prose', () => {
    expect(findJoinableInText('join https://zoom.us.evil.com/j/91234567890 now')).toBeNull();
  });
});
