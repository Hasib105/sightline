import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAMES = Array.from(
  new Set(
    [
      process.env.APP_V1_SESSION_COOKIE_NAME,
      process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME,
      process.env.SESSION_COOKIE_NAME,
      "app_v1_session",
      "app_v1_refresh",
      "kern_v1_session",
      "kern_v1_refresh",
      "sightline_session",
      "sightline_refresh",
    ]
      .map((name) => name?.trim())
      .filter((name): name is string => Boolean(name))
  )
);

function clearAuthCookies(response: NextResponse): NextResponse {
  for (const cookieName of AUTH_COOKIE_NAMES) {
    response.cookies.delete(cookieName);
  }
  return response;
}

export function POST() {
  return clearAuthCookies(NextResponse.json({ message: "Signed out." }));
}

export function GET(request: NextRequest) {
  return clearAuthCookies(NextResponse.redirect(new URL("/login", request.url)));
}
