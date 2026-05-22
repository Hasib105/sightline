"use client";

import { useState, type ReactNode } from "react";
import { Braces, CheckCircle2 } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { GradientText } from "@/components/motion/GradientText";
import { cn } from "@/lib/utils";

const snippets = {
  python: `from sightline import VideoReview

review = VideoReview(api_url="http://127.0.0.1:8000/api")

alerts = review.alerts(
    session="PHY-101-midterm",
    status="needs_review",
)`,
  ts: `const response = await fetch("/api/integrity/alerts/");
const { alerts } = await response.json();

const open = alerts.filter((alert) => alert.status === "needs_review");`,
  go: `ws://127.0.0.1:8000/ws/alerts/

event: alert.created
session: PHY-101-midterm
seat: B-14
type: looking_toward_neighbor`,
  php: `POST /api/integrity/alerts/{id}/review/

{
  "status": "reviewed",
  "action": "warned_student",
  "notes": "Invigilator checked evidence clip."
}`,
};

type TabKey = keyof typeof snippets;

const labels: Record<TabKey, string> = {
  python: "Python",
  ts: "TypeScript",
  go: "Go",
  php: "PHP",
};

function WindowDots() {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full bg-[hsl(0_78%_66%)]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[hsl(40_92%_62%)]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[hsl(104_42%_55%)]" />
    </div>
  );
}

function CodeToken({ tone, children }: { tone: "key" | "string" | "muted" | "accent"; children: ReactNode }) {
  return (
    <span
      className={cn(
        tone === "key" && "text-brand-2",
        tone === "string" && "text-[hsl(142_42%_39%)] dark:text-[hsl(142_52%_70%)]",
        tone === "muted" && "text-muted-foreground",
        tone === "accent" && "text-[hsl(260_70%_62%)] dark:text-[hsl(260_80%_76%)]",
      )}
    >
      {children}
    </span>
  );
}

export function Playground() {
  const [tab, setTab] = useState<TabKey>("python");

  return (
    <section className="container mx-auto max-w-7xl px-6 py-24 sm:py-32">
      <Reveal className="mx-auto max-w-6xl text-center">
        <h2 className="font-display text-[clamp(2rem,4.2vw,3.75rem)] font-extrabold leading-[1.05] tracking-tight sm:whitespace-nowrap">
          API surfaces for <GradientText>video review</GradientText>
        </h2>
        <p className="mx-auto mt-4 max-w-3xl text-muted-foreground sm:text-lg">
          The web app sits on a Django API, background analysis jobs, optional WebSocket updates, and a separate worker.
        </p>
      </Reveal>

      <Reveal className="mx-auto mt-12 max-w-6xl">
        <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-elevated/95 shadow-float backdrop-blur">
          <div className="flex items-center justify-between gap-4 border-b border-border-subtle bg-muted/35 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <WindowDots />
              <span className="truncate text-xs font-bold text-foreground sm:text-sm">sightline-api</span>
            </div>
            <span className="hidden rounded-full border border-border-subtle bg-background/80 px-3 py-1 text-[10px] font-bold uppercase tracking-normal text-muted-foreground sm:inline-flex">
              SDK quickstart
            </span>
          </div>

          <div className="grid divide-y divide-border-subtle lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:divide-x lg:divide-y-0">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle bg-muted/20 px-3 py-2">
                {(Object.keys(snippets) as TabKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                      tab === key
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {labels[key]}
                  </button>
                ))}
              </div>

              <pre className="min-h-[360px] whitespace-pre-wrap break-words px-5 py-5 font-mono text-[11px] leading-5 text-foreground sm:text-[12.5px]">
                <code>{snippets[tab]}</code>
              </pre>
            </div>

            <div className="min-w-0 bg-background/45">
              <div className="flex items-center justify-between gap-3 border-b border-border-subtle bg-muted/20 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Braces className="h-4 w-4 text-brand-2" />
                  response.json
                </div>
                <span className="rounded-full border border-border-subtle bg-surface/80 px-3 py-1 text-[10px] font-bold text-muted-foreground">
                  412 ms
                </span>
              </div>
              <pre className="min-h-[360px] whitespace-pre-wrap break-words px-5 py-5 font-mono text-[11px] leading-5 text-foreground sm:text-[12.5px]">
                <code>
                  {"{\n"}
                  {"  "}
                  <CodeToken tone="key">&quot;session&quot;</CodeToken>:{" "}
                  <CodeToken tone="string">&quot;PHY-101-midterm&quot;</CodeToken>,
                  {"\n  "}
                  <CodeToken tone="key">&quot;alerts&quot;</CodeToken>: [
                  {"\n    {"}
                  {"\n      "}
                  <CodeToken tone="key">&quot;type&quot;</CodeToken>:{" "}
                  <CodeToken tone="string">&quot;looking_toward_neighbor&quot;</CodeToken>,
                  {"\n      "}
                  <CodeToken tone="key">&quot;seat&quot;</CodeToken>:{" "}
                  <CodeToken tone="string">&quot;B-14&quot;</CodeToken>,
                  {"\n      "}
                  <CodeToken tone="key">&quot;confidence&quot;</CodeToken>: <CodeToken tone="accent">0.82</CodeToken>
                  {"\n    }"}
                  {"\n  ],\n  "}
                  <CodeToken tone="key">&quot;review_policy&quot;</CodeToken>:{" "}
                  <CodeToken tone="muted">&quot;human_required&quot;</CodeToken>
                  {"\n}"}
                </code>
              </pre>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border-subtle bg-muted/25 px-5 py-4 font-mono text-[11px] text-muted-foreground sm:text-xs">
            <span className="inline-flex items-center gap-1.5 text-foreground/80">
              <CheckCircle2 className="h-3.5 w-3.5 text-brand-1" /> 4 open alerts
            </span>
            <span>2 evidence clips</span>
            <span>412 ms</span>
            <span>Upload + worker + review</span>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
