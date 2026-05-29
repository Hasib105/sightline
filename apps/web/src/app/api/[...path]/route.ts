import { NextResponse, type NextRequest } from "next/server";

import { apiBaseUrl } from "@/lib/api-base-url";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxyDjangoApi(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const targetPath = path.join("/");
  const search = request.nextUrl.search;
  const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.text();
  const headers = new Headers(request.headers);

  headers.delete("host");
  headers.delete("content-length");

  const upstream = await fetch(`${apiBaseUrl()}/api/${targetPath}${search}`, {
    method: request.method,
    headers,
    body,
    redirect: "follow",
  });

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new NextResponse(await upstream.text(), {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = proxyDjangoApi;
export const POST = proxyDjangoApi;
export const PUT = proxyDjangoApi;
export const PATCH = proxyDjangoApi;
export const DELETE = proxyDjangoApi;
