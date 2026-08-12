import { NextResponse, type NextRequest } from 'next/server';

// Protect core app routes by requiring a session cookie.
// Also enforce forced password reset based on 'force_reset' cookie.

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/invoices',
  '/products',
  '/customers',
  '/settings',
  '/superadmin',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = req.cookies.get('session')?.value;
  const forceReset = req.cookies.get('force_reset')?.value;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isLogin = pathname === '/login';
  const isForceResetPage = pathname.startsWith('/reset-password/force');
  const isAuthApi = pathname.startsWith('/api/auth');

  // Enforce reset flow if flagged
  if (forceReset && !isForceResetPage && !isAuthApi) {
    const url = req.nextUrl.clone();
    url.pathname = '/reset-password/force';
    return NextResponse.redirect(url);
  }

  // Protect pages from unauthenticated access
  if (isProtected && !session && !isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Prevent accessing login when already logged in
  if (isLogin && session) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/invoices/:path*',
    '/products/:path*',
    '/customers/:path*',
    '/settings/:path*',
    '/superadmin/:path*',
    '/login',
    '/reset-password/force',
    '/api/:path*',
  ],
};
