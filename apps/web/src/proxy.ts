import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE_NAMES = Array.from(
  new Set(
    [
      process.env.APP_V1_SESSION_COOKIE_NAME,
      process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME,
      process.env.SESSION_COOKIE_NAME,
      "app_v1_session",
      "kern_v1_session",
      "sightline_session",
    ]
      .map((name) => name?.trim())
      .filter((name): name is string => Boolean(name))
  )
);

function hasSessionCookie(request: NextRequest): boolean {
  return AUTH_COOKIE_NAMES.some((name) => Boolean(request.cookies.get(name)?.value));
}

export function proxy(request: NextRequest) {
  if (hasSessionCookie(request)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set("next", nextPath);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
