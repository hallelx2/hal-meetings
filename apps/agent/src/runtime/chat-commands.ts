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
 * Remove Hal's own disclosure from a chunk of chat text.
 *
 * The disclosure contains the literal "/hal stop", so without this Hal reads
 * its own announcement and leaves the meeting moments after joining.
 *
 * It **subtracts** rather than rejects, and that distinction is the whole bug
 * it replaces. The previous version discarded any chunk that contained the
 * disclosure — but the disclosure is permanently in the panel, so a diff that
 * happened to include it took the real command down with it. `/hal leave` was
 * typed into two live meetings and silently swallowed both times.
 *
 * Now only the disclosure's own text is cut out; anything else in the chunk
 * survives.
 */
export function stripOwnDisclosure(text: string, disclosure: string): string {
  if (!disclosure || !text) return text;

  let haystack = text.replace(/\s+/g, ' ');
  const needle = disclosure.replace(/\s+/g, ' ').trim();
  if (!needle) return haystack;

  // Every occurrence, not the first. Meet keeps the disclosure in the panel and
  // the watcher re-reads the whole panel, so the same message is seen again on
  // every poll — removing only one copy left the rest, and the `/hal stop`
  // inside it ended the meeting three seconds after joining. Verified live.
  for (const length of [needle.length, 80, 60, 40]) {
    const fragment = needle.slice(0, Math.min(length, needle.length));
    if (fragment.length < 20) break;

    for (;;) {
      const at = haystack.toLowerCase().indexOf(fragment.toLowerCase());
      if (at === -1) break;
      haystack = (haystack.slice(0, at) + ' ' + haystack.slice(at + fragment.length)).trim();
    }
  }

  // Belt and braces. The disclosure names the commands it advertises, so any
  // surviving fragment of it still carries them — and a bot that removes
  // itself on sight of its own announcement is worse than one that lingers.
  return stripQuotedCommands(haystack, disclosure);
}

/**
 * Drop kill commands that are only present because the disclosure quotes them.
 *
 * The disclosure says: Reply '/hal stop' or '/hal leave' in chat and I'll go.
 * Those are quoted, so a command wrapped in the same quotation marks the
 * disclosure uses is almost certainly Hal's own text surviving a partial strip
 * — never a participant, who types the command bare.
 */
function stripQuotedCommands(text: string, disclosure: string): string {
  let out = text;
  for (const command of KILL_COMMANDS) {
    if (!disclosure.toLowerCase().includes(command)) continue;
    for (const quoted of [`'${command}'`, `"${command}"`, `\u2018${command}\u2019`, `\u201c${command}\u201d`]) {
      out = out.replace(new RegExp(escapeRegExp(quoted), 'gi'), ' ');
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
