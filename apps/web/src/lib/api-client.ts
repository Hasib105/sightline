"use client";

import { apiBaseUrl } from "@/lib/api-base-url";

const ACCESS_TOKEN_STORAGE_KEY = "sightline_access_token";
const REFRESH_TOKEN_STORAGE_KEY = "sightline_refresh_token";

function readStoredToken(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return null;
  }
  const normalized = raw.trim();
  return normalized ? normalized : null;
}

function writeStoredToken(key: string, value: string | null): void {
  if (typeof window === "undefined") {
    return;
  }
  if (!value) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, value);
}

async function refreshAccessToken(baseUrl: string): Promise<string | null> {
  const refreshToken = readStoredToken(REFRESH_TOKEN_STORAGE_KEY);

  const response = await fetch(`${baseUrl}/auth/token/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    writeStoredToken(ACCESS_TOKEN_STORAGE_KEY, null);
    writeStoredToken(REFRESH_TOKEN_STORAGE_KEY, null);
    return null;
  }

  const payload = (await response.json().catch(() => null)) as
    | { access_token?: string; refresh_token?: string }
    | null;
  const nextAccessToken = payload?.access_token?.trim() || null;
  const nextRefreshToken = payload?.refresh_token?.trim() || null;
  writeStoredToken(ACCESS_TOKEN_STORAGE_KEY, nextAccessToken);
  writeStoredToken(REFRESH_TOKEN_STORAGE_KEY, nextRefreshToken);
  return nextAccessToken;
}

function buildAuthHeaders(headers: Headers): Headers {
  return new Headers(headers);
}

export async function apiFetchClient(path: string, options: RequestInit = {}): Promise<Response> {
  const baseUrl = apiBaseUrl();
  const url = path.startsWith("http")
    ? path
    : `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
  const baseHeaders = new Headers(options.headers);

  let headers = buildAuthHeaders(baseHeaders);
  let response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status !== 401) {
    return response;
  }

  const refreshedAccessToken = await refreshAccessToken(baseUrl);
  if (!refreshedAccessToken) {
    return response;
  }

  headers = new Headers(baseHeaders);
  headers.set("Authorization", `Bearer ${refreshedAccessToken}`);
  response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
  return response;
}

export function persistAuthTokens(tokens: {
  access_token?: string;
  refresh_token?: string;
}): void {
  void tokens;
  writeStoredToken(ACCESS_TOKEN_STORAGE_KEY, null);
  writeStoredToken(REFRESH_TOKEN_STORAGE_KEY, null);
}

export function clearAuthTokens(): void {
  writeStoredToken(ACCESS_TOKEN_STORAGE_KEY, null);
  writeStoredToken(REFRESH_TOKEN_STORAGE_KEY, null);
}
