import { redirect } from 'next/navigation';

/**
 * `/app` was the cockpit. It is now the dashboard, at `/dashboard`.
 *
 * Kept as a redirect rather than deleted: it is the callbackURL baked into
 * every OAuth grant issued so far, and it is what anyone who bookmarked the
 * cockpit has. Breaking it would strand exactly the people who used the product
 * earliest.
 */
export default function Page() {
  redirect('/dashboard');
}
