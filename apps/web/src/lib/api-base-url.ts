const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

function normalizeBaseUrl(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function apiBaseUrl(): string {
  if (typeof window === "undefined") {
    return normalizeBaseUrl(process.env.API_INTERNAL_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL);
  }
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (configured) {
    return normalizeBaseUrl(configured);
  }
  return "";
}

export function apiMediaBaseUrl(): string {
  if (typeof window === "undefined") {
    return normalizeBaseUrl(process.env.API_INTERNAL_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL);
  }
  return normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL);
}

export function apiWebSocketBaseUrl(): string {
  const baseUrl = apiMediaBaseUrl();
  return baseUrl.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
}
