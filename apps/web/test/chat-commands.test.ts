import { describe, expect, it } from 'bun:test';
import {
  findKillCommand,
  stripOwnDisclosure,
  newText,
  KILL_COMMANDS,
} from '../../agent/src/runtime/chat-commands';

const DISCLOSURE =
  "Hi — I'm Hal, an AI assistant joining on Oludele Halleluyah's behalf. I'm transcribing this meeting. Reply '/hal stop' or '/hal leave' in chat and I'll go.";

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

describe('stripOwnDisclosure', () => {
  it('removes Hal\u2019s own announcement so it cannot trigger itself', () => {
    const out = stripOwnDisclosure(`Hal \u00b7 AI 12:03 ${DISCLOSURE}`, DISCLOSURE);
    expect(findKillCommand(out)).toBeNull();
  });

  it('keeps a real request that arrives in the same chunk as the disclosure', () => {
    // The bug this replaces, and it cost two live meetings. The disclosure sits
    // in the panel permanently, so rejecting any chunk containing it threw the
    // command away with it \u2014 /hal leave was typed twice and silently swallowed.
    const chunk = `Hal \u00b7 AI 12:03 ${DISCLOSURE} Ada 12:05 /hal leave`;
    expect(findKillCommand(stripOwnDisclosure(chunk, DISCLOSURE))).toBe('/hal leave');
  });

  it('handles the disclosure being wrapped or truncated by the client', () => {
    const chunk = `${DISCLOSURE.slice(0, 70)} \u2026 Ada /hal stop`;
    expect(findKillCommand(stripOwnDisclosure(chunk, DISCLOSURE))).toBe('/hal stop');
  });

  it('leaves text alone when there is no disclosure to remove', () => {
    expect(stripOwnDisclosure('Ada /hal stop', '')).toBe('Ada /hal stop');
  });

  it('does not remove an unrelated message that merely mentions Hal', () => {
    const out = stripOwnDisclosure('Ada: hal is transcribing this meeting?', DISCLOSURE);
    expect(out).toContain('hal is transcribing');
  });
});

describe('stripOwnDisclosure — not triggering itself', () => {
  it('survives the panel being re-read, which repeats the disclosure', () => {
    // Verified live: the watcher re-reads the whole panel every poll, so the
    // disclosure appears again and again. Removing only the first copy left the
    // rest, and the quoted "/hal stop" inside it ended the meeting three
    // seconds after joining.
    const repeated = `${DISCLOSURE} ${DISCLOSURE} ${DISCLOSURE}`;
    expect(findKillCommand(stripOwnDisclosure(repeated, DISCLOSURE))).toBeNull();
  });

  it('ignores the commands the disclosure quotes, even after a partial strip', () => {
    // A fragment of the disclosure that survives still carries the quoted
    // commands. A bot that removes itself on sight of its own announcement is
    // worse than one that lingers.
    const fragment = "Reply '/hal stop' or '/hal leave' in chat and I'll go.";
    expect(findKillCommand(stripOwnDisclosure(fragment, DISCLOSURE))).toBeNull();
  });

  it('still hears a participant typing the command bare', () => {
    // The whole point. Quoted means Hal's own words; bare means a human asking.
    const chunk = `${DISCLOSURE} Ada 12:05 /hal leave`;
    expect(findKillCommand(stripOwnDisclosure(chunk, DISCLOSURE))).toBe('/hal leave');
  });

  it('hears a bare command even when the panel repeats the disclosure', () => {
    const chunk = `${DISCLOSURE} ${DISCLOSURE} Ada /hal stop`;
    expect(findKillCommand(stripOwnDisclosure(chunk, DISCLOSURE))).toBe('/hal stop');
  });
});
