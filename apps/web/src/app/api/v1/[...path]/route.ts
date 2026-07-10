import { NextResponse, type NextRequest } from "next/server";

import { apiBaseUrl } from "@/lib/api-base-url";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxyApiV1(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const targetPath = path.join("/");
  const search = request.nextUrl.search;
  const body = ["GET", "HEAD"].includes(request.method) ? undefined : request.body;
  const headers = new Headers(request.headers);

  headers.delete("host");
  headers.delete("content-length");
  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.set("cookie", cookie);
  }

  const upstream = await fetch(`${apiBaseUrl()}/api/v1/${targetPath}${search}`, {
    method: request.method,
    headers,
    body,
    duplex: "half",
    redirect: "manual",
  } as RequestInit);

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = proxyApiV1;
export const POST = proxyApiV1;
export const PUT = proxyApiV1;
export const PATCH = proxyApiV1;
export const DELETE = proxyApiV1;
