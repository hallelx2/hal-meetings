import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIES = [
  'better-auth.session_token',
  '__Secure-better-auth.session_token',
];

function hasSessionCookie(request: NextRequest): boolean {
  return SESSION_COOKIES.some((name) => Boolean(request.cookies.get(name)?.value));
}

export function middleware(request: NextRequest) {
  if (!hasSessionCookie(request)) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*'],
};
