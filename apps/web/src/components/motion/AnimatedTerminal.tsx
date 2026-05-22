"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ResponseTab = "json" | "markdown";

const responseTabs: { key: ResponseTab; label: string }[] = [
  { key: "json", label: "JSON" },
  { key: "markdown", label: "Markdown" },
];

function CodePane({
  title,
  eyebrow,
  children,
  className,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 bg-background/70", className)}>
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border-subtle bg-muted/30 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-xs font-bold text-foreground sm:text-sm">{title}</span>
        </div>
        <span className="shrink-0 rounded-full border border-border-subtle bg-surface/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-normal text-muted-foreground">
          {eyebrow}
        </span>
      </div>
      {children}
    </div>
  );
}

function Token({ children, tone }: { children: ReactNode; tone: "accent" | "key" | "string" | "number" | "muted" | "shell" }) {
  return (
    <span
      className={cn(
        tone === "accent" && "text-brand-2",
        tone === "key" && "text-[hsl(184_85%_38%)] dark:text-[hsl(184_85%_68%)]",
        tone === "string" && "text-[hsl(142_42%_36%)] dark:text-[hsl(142_52%_70%)]",
        tone === "number" && "text-[hsl(260_70%_58%)] dark:text-[hsl(260_80%_76%)]",
        tone === "muted" && "text-muted-foreground",
        tone === "shell" && "text-[hsl(40_78%_42%)] dark:text-[hsl(40_95%_70%)]",
      )}
    >
      {children}
    </span>
  );
}

function RequestCode() {
  return (
    <pre className="whitespace-pre-wrap break-words px-4 py-4 font-mono text-[11px] leading-5 text-foreground sm:text-[12px] lg:text-[12.5px]">
      <code>
        <span>
          <Token tone="shell">$</Token> curl <Token tone="accent">http://127.0.0.1:8000/api/integrity/alerts/</Token>
        </span>
        {"\n\n"}
        <Token tone="muted"># Optional alert status stream</Token>
        {"\n"}
        <Token tone="shell">$</Token> ws://127.0.0.1:8000/ws/alerts/
      </code>
    </pre>
  );
}

function JsonResponse() {
  return (
    <pre className="whitespace-pre-wrap break-words px-4 py-4 font-mono text-[11px] leading-5 text-foreground sm:text-[12px] lg:text-[12.5px]">
      <code>
        {"{\n"}
        <span>
          {"  "}
          <Token tone="key">&quot;session&quot;</Token>: <Token tone="string">&quot;PHY-101 midterm&quot;</Token>,
        </span>
        {"\n"}
        <span>
          {"  "}
          <Token tone="key">&quot;video&quot;</Token>: <Token tone="string">&quot;phy-101-midterm.mp4&quot;</Token>,
        </span>
        {"\n"}
        <span>
          {"  "}
          <Token tone="key">&quot;alerts&quot;</Token>: [
        </span>
        {"\n"}
        <span>{"    {"}</span>
        {"\n"}
        <span>
          {"      "}
          <Token tone="key">&quot;type&quot;</Token>: <Token tone="string">&quot;looking_toward_neighbor&quot;</Token>,
        </span>
        {"\n"}
        <span>
          {"      "}
          <Token tone="key">&quot;seat&quot;</Token>: <Token tone="string">&quot;B-14&quot;</Token>,
        </span>
        {"\n"}
        <span>
          {"      "}
          <Token tone="key">&quot;evidence&quot;</Token>: <Token tone="string">&quot;snapshot-001.jpg&quot;</Token>,
        </span>
        {"\n"}
        <span>
          {"      "}
          <Token tone="key">&quot;confidence&quot;</Token>: <Token tone="number">0.82</Token>,
        </span>
        {"\n"}
        <span>
          {"      "}
          <Token tone="key">&quot;status&quot;</Token>: <Token tone="string">&quot;needs_review&quot;</Token>
        </span>
        {"\n"}
        <span>{"    }"}</span>
        {"\n"}
        <span>{"  ]"}</span>
        {"\n"}
        <span>
          {"  "}
          <Token tone="key">&quot;review_policy&quot;</Token>: <Token tone="string">&quot;human_required&quot;</Token>
        </span>
        {"\n}"}
      </code>
    </pre>
  );
}

function MarkdownResponse() {
  return (
    <pre className="whitespace-pre-wrap break-words px-4 py-4 font-mono text-[11px] leading-5 text-foreground sm:text-[12px] lg:text-[12.5px]">
      <code>
        <Token tone="accent"># Alert Review</Token>
        {"\n\n"}
        <Token tone="muted">Exam: PHY-101 midterm | Video: phy-101-midterm.mp4</Token>
        {"\n\n"}
        A suspicious moment was flagged in the uploaded video for repeated looking toward a neighboring desk.
        {"\n\n"}
        <Token tone="key">## Review packet</Token>
        {"\n"}
        - Confidence: 0.82
        {"\n"}
        - Evidence: snapshot + 12 second clip
        {"\n"}
        - Required action: invigilator review
        {"\n\n"}
        <Token tone="muted">Sightline records suspicion, not a verdict.</Token>
      </code>
    </pre>
  );
}

export function AnimatedTerminal() {
  const [tab, setTab] = useState<ResponseTab>("json");

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border-subtle bg-surface-elevated/92 shadow-float backdrop-blur">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-radial-soft opacity-70" />
      <div className="relative flex items-center justify-between gap-3 border-b border-border-subtle bg-muted/35 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[hsl(0_70%_60%)]" />
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[hsl(40_90%_55%)]" />
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[hsl(140_55%_50%)]" />
          <span className="ml-2 truncate text-xs font-bold text-foreground sm:text-sm">
            sightline - video review demo
          </span>
        </div>
        <span className="hidden shrink-0 rounded-full border border-border-subtle bg-surface/80 px-3 py-1 text-[10px] font-bold uppercase tracking-normal text-muted-foreground sm:inline-flex">
          mvp alert
        </span>
      </div>

      <div className="relative grid divide-y divide-border-subtle lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:divide-x lg:divide-y-0">
        <CodePane title="request.curl" eyebrow="GET /api/integrity/alerts">
          <div className="min-h-[320px]">
            <RequestCode />
          </div>
          <div className="border-t border-border-subtle bg-muted/25 px-4 py-3 font-mono text-[10px] text-muted-foreground sm:text-[11px]">
            API, WebSocket, evidence, and review state stay connected.
          </div>
        </CodePane>

        <CodePane
          title="response"
          eyebrow="200 OK"
          className="shadow-[inset_1px_0_0_hsl(var(--brand-1)/0.12)]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border-subtle bg-muted/20 px-3 py-2">
            <div className="inline-flex rounded-full border border-border-subtle bg-surface/80 p-1">
              {responseTabs.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                    tab === item.key
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <span className="hidden text-[11px] font-semibold text-muted-foreground sm:inline">
              human review required
            </span>
          </div>
          {tab === "json" ? <JsonResponse /> : <MarkdownResponse />}
        </CodePane>
      </div>
    </div>
  );
}
