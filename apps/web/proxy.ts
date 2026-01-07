import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Proxy (replaces middleware.ts in Next.js 16)
 *
 * Official Next.js 16 documentation:
 * https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 *
 * Handles authentication redirects using better-auth session cookies.
 * - Redirects authenticated users away from auth pages (login, register, etc.)
 * - Reads session from cookie for optimistic checks (no database queries)
 *
 * Important: Proxy is meant for optimistic checks only (cookie-based).
 * Do not use database queries in proxy for performance reasons.
 */

// Better-auth cookie name format: ${prefix}.${cookie_name}
// With prefix "auth" and cookie name "session_token", the full name is "auth.session_token"
// Source: https://www.better-auth.com/docs/concepts/cookies
const SESSION_COOKIE_NAME = "auth.session_token";

// Routes that should redirect authenticated users to dashboard
const AUTH_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email",
];

// Routes that require authentication
const PROTECTED_ROUTES = ["/dashboard", "/app"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = Boolean(sessionToken);

  // Debug: log to help verify cookie is being read correctly
  console.log("[proxy]", {
    pathname,
    cookieName: SESSION_COOKIE_NAME,
    hasSession: Boolean(sessionToken),
    sessionTokenPreview: sessionToken
      ? `${sessionToken.slice(0, 10)}...`
      : null,
    allCookies: request.cookies.getAll().map((c) => c.name),
  });

  // Check if current path is an auth route
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // Check if current path is a protected route
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Redirect authenticated users away from auth pages to dashboard
  if (isAuthenticated && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Redirect unauthenticated users to login for protected routes
  if (!isAuthenticated && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Preserve the intended destination for redirect after login
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Configure which routes the proxy should run on
// Exclude: API routes, Next.js internals, static files
export const config = {
  matcher: [
    // Match all paths except:
    // - API routes (/api/*)
    // - _next (Next.js internals)
    // - Static files with extensions (images, fonts, etc.)
    // - favicon.ico
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
