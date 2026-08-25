/**
 * The authenticated navigation.
 *
 * Only destinations that exist are listed. Ask (HAL-806) joins this array when
 * its screen lands — a nav entry pointing at a 404, or at a placeholder that
 * says "coming soon", teaches people the nav lies.
 */
export type NavItem = {
  href: string;
  label: string;
  /** Short form for the mobile dock, where a long label wraps or truncates. */
  short: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', short: 'Home' },
  { href: '/meetings', label: 'Meetings', short: 'Meetings' },
  { href: '/settings', label: 'Settings', short: 'Settings' },
];

/**
 * Which nav item owns this path.
 *
 * Prefix-matched so `/meetings/abc` still lights up Meetings, but guarded on a
 * segment boundary so `/settings-export` does not light up `/settings`.
 */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
