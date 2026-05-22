"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiBaseUrl } from "@/lib/api-base-url";

export function EarlyAccessForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [useCase, setUseCase] = useState("");
  const [expectedVolume, setExpectedVolume] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${apiBaseUrl()}/api/v1/early-access/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          company,
          use_case: useCase,
          expected_volume: expectedVolume,
        }),
      });
      const body = (await response.json().catch(() => null)) as { detail?: string } | null;
      if (!response.ok) {
        setMessage(body?.detail ?? "We could not save your request. Email inquiry@sightlinesearch.dev.");
        return;
      }
      setSubmitted(true);
      setMessage("Thanks. Your early-access request is on the list.");
    } catch {
      setMessage("We could not reach the API. Email inquiry@sightlinesearch.dev and we will help.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface p-5 text-sm shadow-card">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-brand-soft text-brand-1">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <div>
            <p className="font-display text-lg font-bold">Request received</p>
            <p className="mt-1 leading-6 text-muted-foreground">
              We will reach out when a spot opens. For urgent access, email{" "}
              <a className="font-semibold text-foreground" href="mailto:inquiry@sightlinesearch.dev">
                inquiry@sightlinesearch.dev
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
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
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5 text-sm font-semibold">
          <span>Name</span>
          <Input
            autoComplete="name"
            placeholder="Your name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-11 rounded-xl border-border-subtle bg-surface"
          />
        </label>
        <label className="block space-y-1.5 text-sm font-semibold">
          <span>Company</span>
          <Input
            autoComplete="organization"
            placeholder="Company"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            className="h-11 rounded-xl border-border-subtle bg-surface"
          />
        </label>
      </div>
      <label className="block space-y-1.5 text-sm font-semibold">
        <span>Use case</span>
        <Input
          placeholder="academic operations search, risk analytics, enrichment..."
          value={useCase}
          onChange={(event) => setUseCase(event.target.value)}
          className="h-11 rounded-xl border-border-subtle bg-surface"
        />
      </label>
      <label className="block space-y-1.5 text-sm font-semibold">
        <span>Expected volume</span>
        <Input
          placeholder="Example: 50k searches/month"
          value={expectedVolume}
          onChange={(event) => setExpectedVolume(event.target.value)}
          className="h-11 rounded-xl border-border-subtle bg-surface"
        />
      </label>
      <Button
        type="submit"
        className="h-11 w-full rounded-full bg-gradient-to-r from-brand-1 to-brand-2 font-bold text-white shadow-[0_18px_44px_-24px_hsl(197_90%_52%)] hover:opacity-95"
        disabled={loading}
      >
        {loading ? "Sending..." : "Get started"}
        <ArrowRight className="h-4 w-4" />
      </Button>
      {message ? (
        <p className="rounded-xl border border-border-subtle bg-muted/35 px-3 py-2 text-xs leading-5 text-muted-foreground">
          {message}
        </p>
      ) : null}
    </form>
  );
}
