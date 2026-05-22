export type SocialAuthProcess = "login" | "signup";
export type SocialProviderId = "google" | "microsoft" | "github";

export type SocialProvider = {
  id: SocialProviderId;
  label: string;
  hint: string;
};

const DEFAULT_WEB_BASE_URL = "http://localhost:3000";

export const SOCIAL_PROVIDERS: SocialProvider[] = [
  {
    id: "google",
    label: "Google",
    hint: "Fast access for Gmail and Workspace operators.",
  },
  {
    id: "microsoft",
    label: "Microsoft",
    hint: "Best for Entra ID and Microsoft 365 teams.",
  },
  {
    id: "github",
    label: "GitHub",
    hint: "Ideal for engineering and platform operators.",
  },
];

function normalizeBaseUrl(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function originWithPort(origin: string, port: number): string {
  const parsed = new URL(origin);
  parsed.port = String(port);
  return normalizeBaseUrl(parsed.toString());
}

function resolveConfiguredOrigin(
  configured: string | undefined,
  requestOrigin: string | undefined,
  port: number
): string | undefined {
  if (!configured) {
    return undefined;
  }
  if (!requestOrigin) {
    return normalizeBaseUrl(configured);
  }
  const configuredUrl = new URL(configured);
  const requestUrl = new URL(requestOrigin);
  if (configuredUrl.hostname === "localhost" && requestUrl.hostname !== "localhost") {
    return originWithPort(requestOrigin, port);
  }
  return normalizeBaseUrl(configured);
}

export function requestOriginFromHeaders(
  headerMap: Pick<Headers, "get"> | { get(name: string): string | null }
): string {
  const protocol = headerMap.get("x-forwarded-proto") ?? "http";
  const host = headerMap.get("x-forwarded-host") ?? headerMap.get("host") ?? "localhost:3000";
  return `${protocol}://${host}`;
}

export function buildSocialAuthUrl(
  providerId: SocialProviderId,
  authProcess: SocialAuthProcess,
  requestOrigin?: string
): string {
  const configuredAuthBaseUrl = resolveConfiguredOrigin(
    process.env.NEXT_PUBLIC_AUTH_BASE_URL,
    requestOrigin,
    8000
  );
  const authBaseUrl = configuredAuthBaseUrl
    ? normalizeBaseUrl(configuredAuthBaseUrl)
    : "/auth";
  const webBaseUrl = normalizeBaseUrl(
    resolveConfiguredOrigin(
      process.env.NEXT_PUBLIC_WEB_BASE_URL ?? process.env.NEXT_PUBLIC_FRONTEND_BASE_URL,
      requestOrigin,
      3000
    ) ??
      requestOrigin ??
      (typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.host}`
        : DEFAULT_WEB_BASE_URL)
  );

  const params = new URLSearchParams({
    process: authProcess,
    next: `${webBaseUrl}/dashboard`,
  });

  return `${authBaseUrl}/accounts/${providerId}/login/?${params.toString()}`;
}

export function buildLogoutUrl(requestOrigin?: string): string {
  const configuredAuthBaseUrl = resolveConfiguredOrigin(
    process.env.NEXT_PUBLIC_AUTH_BASE_URL,
    requestOrigin,
    8000
  );
  const authBaseUrl = configuredAuthBaseUrl
    ? normalizeBaseUrl(configuredAuthBaseUrl)
    : "/auth";
  return `${authBaseUrl}/accounts/logout/`;
}
