/**
 * The name Hal appears under in a participant list, and in the lobby prompt a
 * host has to act on.
 *
 * This lives in a shared package because two places need the *same* string and
 * they are on opposite sides of the system: the agent types it into the join
 * form, and the web app tells the user what to look out for. If they disagree,
 * the instruction on screen names a guest who never appears — and the host
 * declines an unexplained bot, which is the correct thing for them to do.
 */

/**
 * `{{user}}` is substituted with the person Hal is attending for.
 *
 * Including the user's name is not decoration. A host sees this string in a
 * one-line prompt with an Admit and a Deny button, before any disclosure
 * message can be sent — the admission decision is made on the name alone.
 * "Hal · AI" is an anonymous bot; "Hal · AI for Halleluyah" is a request from
 * someone already in the room.
 */
export const DEFAULT_BOT_NAME_TEMPLATE = 'Hal · AI for {{user}}';

/**
 * Meet and Zoom both truncate long display names, and Zoom rejects some
 * over-long ones outright. 48 keeps the whole string visible in a lobby prompt
 * on a laptop.
 */
export const MAX_BOT_NAME_LENGTH = 48;

/**
 * Render the bot's display name.
 *
 * Truncation trims the *user's* name rather than the tail of the rendered
 * string, because the tail is where the user's name sits — cutting the string
 * would leave "Hal · AI for Halleluyah Darasi…", which reads as a glitch. A
 * first name is a cleaner shortening than an ellipsis and stays recognisable.
 */
export function renderBotName(
  template: string,
  userName: string | null | undefined,
  maxLength: number = MAX_BOT_NAME_LENGTH,
): string {
  const name = (userName ?? '').trim();
  const full = template.replace('{{user}}', name);
  if (full.length <= maxLength) return full.trim();

  // Try the first name before resorting to cutting characters.
  const firstName = name.split(/\s+/)[0] ?? '';
  const short = template.replace('{{user}}', firstName);
  if (short.length <= maxLength) return short.trim();

  return short.slice(0, maxLength).trim();
}
