/**
 * Spotting the kill command in a chat panel whose markup we do not control.
 *
 * The previous approach enumerated individual message nodes
 * (`[data-sender-name]`, `div[data-message-text]`) and matched nothing at all
 * for an entire meeting — silently, with no errors, while the disclosure Hal
 * had just posted promised participants they could remove it. A kill switch
 * that depends on guessing Google's internal class names is a kill switch that
 * will be broken more often than it works.
 *
 * So this does not parse messages. It reads the **whole chat panel as text**,
 * remembers what it read, and looks for the command in whatever is new. The
 * only assumption left is that a chat message eventually becomes visible text
 * inside the chat panel — which is what a chat panel is.
 */

/** The words that remove Hal. `stop` is what the disclosure advertises. */
export const KILL_COMMANDS = ['/hal stop', '/hal leave', '/hal go', '/hal off'] as const;

/**
 * The text that is new since the last poll.
 *
 * A chat panel is append-only in practice, so the usual case is a clean
 * suffix. When it is not — the panel re-rendered, scrolled, or collapsed a
 * group — the whole snapshot is returned rather than nothing. Re-examining
 * text already seen is harmless because commands are de-duplicated by the
 * caller; missing a command because the DOM reflowed is not harmless.
 */
export function newText(previous: string, current: string): string {
  if (!current) return '';
  if (!previous) return current;
  if (current.startsWith(previous)) return current.slice(previous.length);
  return current;
}

/**
 * Find a kill command in a chunk of chat text.
 *
 * Matching is deliberately forgiving. The person typing it is often annoyed,
 * on a phone, or copying it out of the disclosure — so case, surrounding
 * punctuation and a stray "@Hal" in front should not decide whether a
 * recording stops. Returns the matched command, or null.
 *
 * It is NOT anchored to the start of a message: chat clients prepend sender
 * names and timestamps into the same text node, and a command that only works
 * when it is the first thing in the string is a command that mostly does not
 * work.
 */
export function findKillCommand(text: string): string | null {
  if (!text) return null;
  const haystack = text.toLowerCase().replace(/\s+/g, ' ');
  for (const command of KILL_COMMANDS) {
    if (haystack.includes(command)) return command;
  }
  return null;
}

/**
 * Does this text look like Hal's own disclosure?
 *
 * The disclosure contains the literal string "/hal stop" — Hal posts it into
 * the chat itself, so the watcher would read its own message and leave the
 * meeting immediately after announcing itself. This filters exactly that.
 */
export function isOwnDisclosure(text: string, disclosure: string): boolean {
  if (!disclosure) return false;
  // Compare on a distinctive fragment rather than the whole string: chat
  // clients wrap, truncate, and interleave the sender name.
  const fingerprint = disclosure
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 40)
    .trim();
  return fingerprint.length > 0 && text.toLowerCase().replace(/\s+/g, ' ').includes(fingerprint);
}
