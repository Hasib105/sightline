"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

function normalizeBaseUrl(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function apiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (configured) {
    return normalizeBaseUrl(configured);
  }
  if (typeof window !== "undefined") {
    return "";
  }
  return normalizeBaseUrl(DEFAULT_API_BASE_URL);
}

export function PasswordResetForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${apiBaseUrl()}/api/v1/auth/password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as { message?: string; detail?: string };
      setMessage(
        payload.message ??
          payload.detail ??
          "Password reset is not available here. Use your provider account recovery."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block space-y-1.5 text-sm font-semibold">
        <span>Email address</span>
        <Input
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-12 rounded-2xl border-border-subtle bg-surface"
        />
      </label>
      <Button
        type="submit"
        className="h-12 w-full rounded-full bg-gradient-to-r from-brand-1 to-brand-2 font-bold text-white shadow-[0_18px_44px_-24px_hsl(197_90%_52%)] hover:opacity-95"
        disabled={loading}
      >
        {loading ? "Submitting..." : "Request password reset"}
      </Button>
      {message ? (
        <p className="rounded-2xl border border-border-subtle bg-muted/35 px-3 py-2 text-sm leading-6 text-muted-foreground">
          {message}
        </p>
      ) : null}
    </form>
  );
}
