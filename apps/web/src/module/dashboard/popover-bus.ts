/**
 * One signal that closes every open hover panel on the page.
 *
 * A popover and a dialog are separate Radix roots in separate portals, so
 * neither knows the other exists. Open a dialog while a chip is hovered and the
 * popover stays painted underneath the overlay — pointer events go to the
 * overlay, so it cannot even be dismissed by moving away. It just sits there.
 *
 * Threading an `onOpenChange` from every dialog down to every popover would
 * mean a context provider wrapping the whole app for a single boolean that is
 * never read as state. A window event is the smaller thing: dialogs announce,
 * popovers listen, and nothing in between has to know.
 */

const DISMISS = 'hal:dismiss-popovers';

/** Close every open popover. Safe to call during render-free client code only. */
export function dismissPopovers(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(DISMISS));
}

/** Subscribe to the dismissal signal. Returns the unsubscribe function. */
export function onDismissPopovers(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(DISMISS, handler);
  return () => window.removeEventListener(DISMISS, handler);
}
