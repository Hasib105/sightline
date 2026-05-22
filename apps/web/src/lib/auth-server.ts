import { cookies } from "next/headers";

import { type AuthProviderStatus, type CurrentUser } from "@/lib/types";
import { apiBaseUrl } from "@/lib/api-base-url";

function isNetworkFetchError(error: unknown): boolean {
  return error instanceof TypeError;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${apiBaseUrl()}${path.startsWith("/") ? "" : "/"}${path}`;
  const headers = new Headers(options.headers);

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const response = await apiFetch("/api/v1/me", {
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as CurrentUser;
  } catch (error) {
    if (isNetworkFetchError(error)) {
      return null;
    }
    throw error;
  }
}

export async function getAuthProviders(): Promise<AuthProviderStatus[]> {
  try {
    const response = await apiFetch("/api/v1/auth/providers", {
      cache: "no-store",
    });
    if (!response.ok) {
      return [
        { id: "google", label: "Google", enabled: true },
        { id: "github", label: "GitHub", enabled: true },
        { id: "microsoft", label: "Microsoft", enabled: true },
      ];
    }
    return (await response.json()) as AuthProviderStatus[];
  } catch (error) {
    if (!isNetworkFetchError(error)) {
      throw error;
    }
    return [
      { id: "google", label: "Google", enabled: true },
      { id: "github", label: "GitHub", enabled: true },
      { id: "microsoft", label: "Microsoft", enabled: true },
    ];
  }
}
