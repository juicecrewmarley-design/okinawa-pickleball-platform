import { NextResponse, type NextRequest } from "next/server";

const accessTokenCookieName = "opba-access-token";

const publicPathPrefixes = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/register",
  "/api/legacy-members/lookup",
  "/api/supabase-config"
];

function isPublicPath(pathname: string) {
  return publicPathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const hasAccessToken = Boolean(request.cookies.get(accessTokenCookieName)?.value);

  if (!hasAccessToken) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};
