import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIES = [
  'better-auth.session_token',
  '__Secure-better-auth.session_token',
];

function hasSessionCookie(request: NextRequest): boolean {
  return SESSION_COOKIES.some((name) => Boolean(request.cookies.get(name)?.value));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const signedIn = hasSessionCookie(request);

  if (pathname === '/' && signedIn) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  if (pathname.startsWith('/app') && !signedIn) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/app/:path*'],
};
