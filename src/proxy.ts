import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// Next.js 16+ uses proxy.ts instead of middleware.ts
// This runs in Edge Runtime — NO Prisma, NO Node.js fs

export const proxy = auth((req: NextRequest & { auth?: { user?: { role?: string } } | null }) => {
  const { pathname } = req.nextUrl;
  const isApiRoute = pathname.startsWith('/api/');

  // Public routes — always accessible
  if (
    pathname === '/' ||
    pathname.startsWith('/demo') ||
    pathname.startsWith('/auth/redirect') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/chat') ||
    pathname.startsWith('/api/speech/transcribe') ||
    pathname.startsWith('/api/topics') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/static')
  ) {
    return NextResponse.next();
  }

  // Not logged in → redirect to login
  if (!req.auth) {
    if (isApiRoute) {
      return NextResponse.json(
        { error: 'Bạn cần đăng nhập để thực hiện thao tác này' },
        { status: 401 }
      );
    }

    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = req.auth.user?.role;

  // Role-based access control
  if (pathname.startsWith('/admin') && role !== 'admin') {
    if (isApiRoute) {
      return NextResponse.json(
        { error: 'Bạn không có quyền thực hiện thao tác này' },
        { status: 403 }
      );
    }

    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (pathname.startsWith('/teacher') && role !== 'teacher' && role !== 'admin') {
    if (isApiRoute) {
      return NextResponse.json(
        { error: 'Bạn không có quyền thực hiện thao tác này' },
        { status: 403 }
      );
    }

    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (pathname.startsWith('/student') && role !== 'student' && role !== 'admin') {
    if (isApiRoute) {
      return NextResponse.json(
        { error: 'Bạn không có quyền thực hiện thao tác này' },
        { status: 403 }
      );
    }

    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};
