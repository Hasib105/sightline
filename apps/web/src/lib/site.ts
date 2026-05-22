const DEFAULT_SITE_URL = "http://localhost:3000";

function normalizeBaseUrl(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function siteBaseUrl(): string {
  return normalizeBaseUrl(
    process.env.NEXT_PUBLIC_WEB_BASE_URL ??
      process.env.NEXT_PUBLIC_FRONTEND_BASE_URL ??
      DEFAULT_SITE_URL
  );
}

