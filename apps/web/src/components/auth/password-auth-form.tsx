"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEFAULT_AUTH_BASE_URL = "http://127.0.0.1:8000";
const LOCAL_DEV_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

type PasswordAuthFormProps = {
  mode: "login" | "signup";
};

type AuthResponseBody = {
  message?: string;
  detail?: string;
  access_token?: string;
  refresh_token?: string;
};

function normalizeBaseUrl(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function authBaseUrls(): string[] {
  const configured = process.env.NEXT_PUBLIC_AUTH_BASE_URL;
  if (configured) {
    return [normalizeBaseUrl(configured)];
  }
  if (typeof window !== "undefined") {
    const urls = [""];
    if (LOCAL_DEV_HOSTS.has(window.location.hostname)) {
      urls.push(normalizeBaseUrl(DEFAULT_AUTH_BASE_URL));
    }
    return urls;
  }
  return [normalizeBaseUrl(DEFAULT_AUTH_BASE_URL)];
}

function authServiceLabel(baseUrl: string): string {
  return baseUrl || "the local auth proxy";
}

async function readAuthResponseBody(response: Response): Promise<AuthResponseBody | null> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as AuthResponseBody;
  } catch {
    return null;
  }
}

function shouldTryNextAuthService(response: Response, body: AuthResponseBody | null): boolean {
  return !body && response.status >= 500;
}

export function PasswordAuthForm({ mode }: PasswordAuthFormProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(() => {
    if (mode !== "signup" || typeof window === "undefined") {
      return "";
    }
    return new URLSearchParams(window.location.search).get("email") ?? "";
  });
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const endpoint = mode === "signup" ? "/auth/register" : "/auth/login";
    const payload =
      mode === "signup"
        ? { username, email, password1, password2 }
        : { identifier, password: password1 };

    try {
      let response: Response | null = null;
      let body: AuthResponseBody | null = null;
      let attemptedService = "";

      for (const baseUrl of authBaseUrls()) {
        attemptedService = baseUrl;
        try {
          response = await fetch(`${baseUrl}${endpoint}`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          body = await readAuthResponseBody(response);
          if (response.ok || !shouldTryNextAuthService(response, body)) {
            break;
          }
        } catch {
          response = null;
          body = null;
        }
      }

      if (!response) {
        setMessage(
          `Unable to reach auth service at ${authServiceLabel(attemptedService)}. Make sure the API is running on port 8000.`
        );
        return;
      }

      if (!response.ok) {
        setMessage(body?.detail ?? "Authentication failed.");
        return;
      }

      if (mode === "signup") {
        setMessage(body?.message ?? "Account created. Please sign in.");
        return;
      }

      const nextPath =
        typeof window === "undefined"
          ? "/dashboard"
          : new URLSearchParams(window.location.search).get("next") || "/dashboard";
      const safeNext =
        nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard";
      router.push(safeNext);
      router.refresh();
    } catch {
      setMessage("Unable to reach the auth service. Make sure the API is running on port 8000.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {mode === "signup" ? (
        <>
          <label className="block space-y-1.5 text-sm font-semibold">
            <span>Username</span>
            <Input
              required
              autoComplete="username"
              placeholder="sightline_builder"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="h-11 rounded-xl border-border-subtle bg-surface"
            />
          </label>
          <label className="block space-y-1.5 text-sm font-semibold">
            <span>Email</span>
            <Input
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 rounded-xl border-border-subtle bg-surface"
            />
          </label>
          <label className="block space-y-1.5 text-sm font-semibold">
            <span>Password</span>
            <Input
              type="password"
              required
              autoComplete="new-password"
              placeholder="Use a strong password"
              value={password1}
              onChange={(event) => setPassword1(event.target.value)}
              className="h-11 rounded-xl border-border-subtle bg-surface"
            />
          </label>
          <label className="block space-y-1.5 text-sm font-semibold">
            <span>Confirm password</span>
            <Input
              type="password"
              required
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={password2}
              onChange={(event) => setPassword2(event.target.value)}
              className="h-11 rounded-xl border-border-subtle bg-surface"
            />
          </label>
        </>
      ) : (
        <>
          <label className="block space-y-1.5 text-sm font-semibold">
            <span>Username or email</span>
            <Input
              required
              autoComplete="username"
              placeholder="you@company.com"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className="h-11 rounded-xl border-border-subtle bg-surface"
            />
          </label>
          <label className="block space-y-1.5 text-sm font-semibold">
            <span>Password</span>
            <Input
              type="password"
              required
              autoComplete="current-password"
              placeholder="Your password"
              value={password1}
              onChange={(event) => setPassword1(event.target.value)}
              className="h-11 rounded-xl border-border-subtle bg-surface"
            />
          </label>
        </>
      )}
      <Button
        type="submit"
        className="h-11 w-full rounded-full bg-gradient-to-r from-brand-1 to-brand-2 font-bold text-white shadow-[0_18px_44px_-24px_hsl(197_90%_52%)] hover:opacity-95"
        disabled={loading}
      >
        {loading ? "Processing..." : mode === "signup" ? "Create account" : "Sign in"}
      </Button>
      {message ? (
        <p className="rounded-xl border border-border-subtle bg-muted/35 px-3 py-2 text-xs leading-5 text-muted-foreground">
          {message}
        </p>
      ) : null}
    </form>
  );
}
