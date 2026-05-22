"use client";

import { Braces, Check, MousePointer2, Search } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { GradientText } from "@/components/motion/GradientText";

const steps = [
  {
    n: "01",
    title: "Upload the exam video",
    body: "A teacher selects the exam context and uploads a recorded video for analysis.",
    illustration: <QueryMockup />,
  },
  {
    n: "02",
    title: "Analyze in the background",
    body: "The worker processes the uploaded video and creates reviewable suspicious-event alerts.",
    illustration: <SearchMockup />,
  },
  {
    n: "03",
    title: "Review and act",
    body: "Invigilators inspect evidence, update review state, and keep an audit trail for any supervision action.",
    illustration: <OutputMockup />,
  },
];

function WindowDots() {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full bg-[hsl(0_78%_66%)]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[hsl(40_92%_62%)]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[hsl(104_42%_55%)]" />
    </div>
  );
}

function QueryMockup() {
  return (
    <div className="relative mx-auto h-[210px] max-w-[500px]">
      <div className="absolute right-4 top-0 h-[170px] w-[380px] max-w-[calc(100vw-4rem)] rounded-2xl border border-foreground/15 bg-surface-elevated p-5 shadow-float backdrop-blur">
        <WindowDots />
        <div className="mt-14 grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-10 rounded-lg border border-border-subtle bg-muted/50 shadow-card" />
          ))}
        </div>
      </div>
      <div className="absolute left-0 top-14 flex h-14 w-full items-center gap-4 rounded-full border border-brand-2/70 bg-background px-5 shadow-[0_18px_60px_-24px_hsl(200_95%_50%/0.7)]">
        <Search className="h-6 w-6 shrink-0 text-muted-foreground" />
        <span className="min-w-0 truncate font-mono text-sm text-foreground/80">
          PHY-101 midterm - upload queued
        </span>
      </div>
      <MousePointer2 className="absolute left-[22%] top-[88px] h-11 w-11 rotate-[-18deg] fill-background text-foreground/55" />
    </div>
  );
}

function SearchMockup() {
  return (
    <div className="relative mx-auto h-[230px] max-w-[500px]">
      <div className="absolute left-1/2 top-6 h-[184px] w-[300px] -translate-x-1/2 rotate-3 rounded-2xl border border-foreground/10 bg-surface/70 shadow-card" />
      <div className="absolute left-1/2 top-2 h-[194px] w-[312px] -translate-x-1/2 rounded-2xl border border-foreground/15 bg-surface-elevated p-5 shadow-float backdrop-blur">
        <div className="mx-auto h-10 w-20 rounded-full bg-muted" />
        <div className="mt-5 space-y-2.5">
          {["Video file", "Analysis job", "Alert signal"].map((label) => (
            <div key={label} className="flex items-center gap-3">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-brand-soft text-brand-2">
                <Check className="h-4 w-4" />
              </span>
              <span className="h-2 flex-1 rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-x-8 bottom-0 overflow-hidden rounded-2xl border border-foreground/15 bg-background px-5 py-4 shadow-card">
        <div className="flex items-end gap-2 opacity-70">
          {Array.from({ length: 12 }).map((_, index) => (
            <span
              key={index}
              className="w-full rounded-full bg-gradient-to-t from-brand-2/65 to-brand-1/35"
              style={{ height: `${24 + ((index * 19) % 54)}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function OutputMockup() {
  return (
    <div className="relative mx-auto h-[225px] max-w-[500px]">
      <div className="absolute right-8 top-0 h-[190px] w-[340px] rounded-2xl border border-foreground/15 bg-surface-elevated p-5 shadow-float backdrop-blur">
        <div className="flex items-center justify-between">
          <WindowDots />
          <span className="rounded-full border border-border-subtle px-3 py-1 text-[10px] font-bold text-muted-foreground">
            MVP
          </span>
        </div>
        <div className="mt-5 space-y-1.5 font-mono text-[11px] leading-5">
          <p>
            <span className="text-brand-2">&quot;alert&quot;</span>:{" "}
            <span className="text-[hsl(142_42%_40%)]">&quot;looking_toward_neighbor&quot;</span>
          </p>
          <p>
            <span className="text-brand-2">&quot;confidence&quot;</span>:{" "}
            <span className="text-foreground">0.82</span>
          </p>
          <p>
            <span className="text-brand-2">&quot;seat&quot;</span>:{" "}
            <span className="text-foreground">&quot;B-14&quot;</span>
          </p>
          <p>
            <span className="text-brand-2">&quot;review&quot;</span>:{" "}
            <span className="text-[hsl(142_42%_40%)]">&quot;human_required&quot;</span>
          </p>
        </div>
      </div>
      <div className="absolute left-0 top-14 flex w-60 items-center gap-3 rounded-2xl border border-foreground/15 bg-background p-4 shadow-card">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand-soft text-brand-2">
          <Braces className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-bold text-foreground">Evidence packet</p>
          <p className="text-xs text-muted-foreground">Ready for review</p>
        </div>
      </div>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section className="relative overflow-hidden px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto mb-14 max-w-3xl text-center sm:mb-20">
          <h2 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            How <GradientText>Sightline</GradientText> works
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Three focused steps from setup to evidence-backed human review.
          </p>
        </Reveal>

        <div className="space-y-16 sm:space-y-20">
          {steps.map((step, index) => (
            <div key={step.n} className="grid min-h-[310px] items-start gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
              <div className="relative grid gap-5 sm:grid-cols-[5rem_1fr]">
                {index < steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="how-works-rail absolute left-10 top-20 hidden h-[calc(100%+3.5rem)] w-0.5 overflow-hidden sm:block"
                  />
                )}
                <div className="font-display text-4xl font-extrabold leading-none tracking-tight text-foreground sm:text-5xl">
                  {step.n}
                </div>
                <div className="relative max-w-lg border-l border-brand-2/45 pl-8 sm:border-l-0 sm:pl-0">
                  <h3 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                    {step.title}
                  </h3>
                  <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
                    {step.body}
                  </p>
                </div>
              </div>
              <div className="pt-2 lg:pt-6">{step.illustration}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
