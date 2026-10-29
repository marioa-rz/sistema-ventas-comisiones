import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  verifyRequestSession,
  type SessionVerification,
} from './lib/server-session';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const frameSources = ["'self'"];
if (supabaseUrl) {
  try {
    const parsed = new URL(supabaseUrl);
    if (parsed.protocol === 'https:') frameSources.push(parsed.origin);
  } catch {
    // La configuración inválida se rechaza al crear el cliente de Supabase.
  }
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  `frame-src ${frameSources.join(' ')}`,
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  'upgrade-insecure-requests',
].join('; ');

const commonSecurityHeaders: Record<string, string> = {
  'Content-Security-Policy': contentSecurityPolicy,
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

function completeResponse(
  request: NextRequest,
  response: NextResponse,
  session?: SessionVerification,
): NextResponse {
  for (const [key, value] of Object.entries(commonSecurityHeaders)) {
    response.headers.set(key, value);
  }
  for (const [key, value] of Object.entries(session?.headers ?? {})) {
    response.headers.set(key, value);
  }
  for (const { name, value, options } of session?.cookies ?? []) {
    response.cookies.set(name, value, options);
  }
  for (const legacyCookie of ['sakura_token', 'sakura_role']) {
    if (request.cookies.has(legacyCookie)) response.cookies.delete(legacyCookie);
  }
  return response;
}

export function routeRequest(
  request: NextRequest,
  authenticated: boolean,
  session?: SessionVerification,
): NextResponse {
  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
  const isSellerRoute = pathname === '/seller' || pathname.startsWith('/seller/');
  const isPrivateRoute = isAdminRoute || isSellerRoute;

  if (pathname === '/login') {
    const portalUrl = new URL('/portal', request.url);
    const redirectParam = request.nextUrl.searchParams.get('redirect');
    if (redirectParam?.startsWith('/') && !redirectParam.startsWith('//')) {
      portalUrl.searchParams.set('redirect', redirectParam);
    }
    return completeResponse(request, NextResponse.redirect(portalUrl, 307), session);
  }

  if (isPrivateRoute && !authenticated) {
    const portalUrl = new URL('/portal', request.url);
    portalUrl.searchParams.set('redirect', `${pathname}${request.nextUrl.search}`);
    const response = NextResponse.redirect(portalUrl, 307);
    response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    return completeResponse(request, response, session);
  }

  const response = NextResponse.next();
  if (isPrivateRoute || pathname === '/portal') {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  }
  return completeResponse(request, response, session);
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const isPrivateRoute =
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/seller' ||
    pathname.startsWith('/seller/');

  if (!isPrivateRoute) return routeRequest(request, false);

  const session = await verifyRequestSession(request);
  return routeRequest(request, session.authenticated, session);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)',
  ],
};
