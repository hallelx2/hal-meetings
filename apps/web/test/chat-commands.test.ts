import { describe, expect, it } from 'bun:test';
import {
  findKillCommand,
  isOwnDisclosure,
  newText,
  KILL_COMMANDS,
} from '../../agent/src/runtime/chat-commands';

const DISCLOSURE =
  "Hi — I'm Hal, an AI assistant joining on Oludele Halleluyah's behalf. I'm transcribing this meeting. Reply '/hal stop' in chat to remove me.";

describe('newText', () => {
  it('returns only the appended part in the normal case', () => {
    expect(newText('Ada: hello', 'Ada: hello Bo: hi')).toBe(' Bo: hi');
  });

  it('returns everything on the first poll', () => {
    expect(newText('', 'Ada: hello')).toBe('Ada: hello');
  });

  it('returns the whole snapshot when the panel re-rendered rather than appended', () => {
    // Scroll, collapse, or a re-render breaks the suffix relationship. Missing
    // a kill command because the DOM reflowed is far worse than re-reading
    // text we have already seen.
    expect(newText('Ada: hello', 'Bo: hi')).toBe('Bo: hi');
  });

  it('is empty when nothing has changed', () => {
    expect(newText('same', 'same')).toBe('');
  });

  it('is empty when the panel is empty', () => {
    expect(newText('Ada: hello', '')).toBe('');
  });
});

describe('findKillCommand', () => {
  it('finds the command the disclosure advertises', () => {
    expect(findKillCommand('Ada 12:04 /hal stop')).toBe('/hal stop');
  });

  it('accepts the words people actually type', () => {
    // The disclosure says "stop", but someone annoyed enough to remove a bot
    // types whatever comes to mind. All of these must work.
    expect(findKillCommand('/hal leave')).toBe('/hal leave');
    expect(findKillCommand('/hal go')).toBe('/hal go');
    expect(findKillCommand('/hal off')).toBe('/hal off');
  });

  it('ignores case', () => {
    expect(findKillCommand('/HAL STOP')).toBe('/hal stop');
    expect(findKillCommand('/Hal Stop')).toBe('/hal stop');
  });

  it('finds it mid-message, because senders and timestamps share the text node', () => {
    // Anchoring to the start of the string was never going to work: chat
    // clients render "Ada Lovelace 12:04 PM /hal stop" as one blob.
    expect(findKillCommand('Ada Lovelace 12:04 PM /hal stop')).toBe('/hal stop');
    expect(findKillCommand('@Hal /hal stop please')).toBe('/hal stop');
  });

  it('survives surrounding punctuation and odd spacing', () => {
    expect(findKillCommand('"/hal   stop"')).toBe('/hal stop');
    expect(findKillCommand('...  /hal\nstop!')).toBe('/hal stop');
  });

  it('returns null for ordinary conversation', () => {
    expect(findKillCommand('can we stop for a second')).toBeNull();
    expect(findKillCommand('hal is taking notes')).toBeNull();
    expect(findKillCommand('')).toBeNull();
  });

  it('does not fire on a near-miss that is not a command', () => {
    expect(findKillCommand('should we make hal stop?')).toBeNull();
  });

  it('advertises the command the disclosure names', () => {
    // If these drift, the disclosure promises something that does not work.
    expect(KILL_COMMANDS).toContain('/hal stop');
    expect(DISCLOSURE.toLowerCase()).toContain('/hal stop');
  });
});

describe('isOwnDisclosure', () => {
  it('recognises Hal reading its own message', () => {
    // The disclosure contains the literal "/hal stop". Without this filter Hal
    // reads its own announcement and leaves immediately after posting it.
    expect(isOwnDisclosure(`Hal · AI 12:03 ${DISCLOSURE}`, DISCLOSURE)).toBe(true);
  });

  it('does not swallow a real request that merely quotes Hal', () => {
    expect(isOwnDisclosure('Ada 12:05 /hal stop', DISCLOSURE)).toBe(false);
  });

  it('is false when there is no disclosure to compare against', () => {
    expect(isOwnDisclosure('anything', '')).toBe(false);
  });
});
