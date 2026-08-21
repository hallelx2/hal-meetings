import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIES = [
  'better-auth.session_token',
  '__Secure-better-auth.session_token',
];

/**
 * Every authenticated route. Keep in step with the `(app)` route group — a
 * screen added there without an entry here loses its cheapest gate, and the
 * only thing standing between an expired session and a protected screen becomes
 * the page itself.
 */
const PROTECTED_PREFIXES = ['/app', '/dashboard', '/settings'];

function hasSessionCookie(request: NextRequest): boolean {
  return SESSION_COOKIES.some((name) => Boolean(request.cookies.get(name)?.value));
}

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Cheap presence check only — no API call, no token verification, no database.
 * Middleware runs on every request including the RSC requests client-side
 * navigation makes, so it catches a session that expired while someone sat on a
 * screen. The page remains the authority on whether they are actually allowed.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const signedIn = hasSessionCookie(request);

  if (pathname === '/' && signedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isProtected(pathname) && !signedIn) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/app/:path*', '/dashboard/:path*', '/settings/:path*'],
};
