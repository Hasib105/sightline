"use client";

import { ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { GradientText } from "@/components/motion/GradientText";
import { dna } from "@/data/features";

export function SightlinePrinciples() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-radial-soft" />
      <div className="container mx-auto max-w-7xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="pill-outline mx-auto inline-flex px-4 py-1.5 text-xs font-semibold">
            <span className="text-gradient-brand">Built on</span>
          </span>
          <h2 className="mt-6 font-display text-[clamp(2rem,4.2vw,3.75rem)] font-extrabold leading-[1.05] tracking-tight sm:whitespace-nowrap">
            Our <GradientText>product principles</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground sm:text-lg">
            Four principles pulled directly from the product requirements and architecture docs.
          </p>
        </Reveal>

        <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-[1fr_minmax(280px,360px)_1fr]">
          <div className="space-y-6">
            {dna.slice(0, 2).map((d, i) => (
              <Reveal key={d.title} delay={i * 0.05}>
                <div className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-card">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand-soft text-brand-2">
                    <d.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold">{d.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{d.body}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="order-first flex items-center justify-center lg:order-none">
            <div className="relative h-72 w-72 sm:h-80 sm:w-80 lg:h-[22rem] lg:w-[22rem]">
              <div className="relative flex h-full w-full items-center justify-center rounded-[2rem] border border-border-subtle bg-surface shadow-float">
                <div aria-hidden className="absolute inset-0 bg-gradient-radial-soft" />
                <ShieldCheck className="relative h-28 w-28 text-brand-2" />
              </div>
            </div>
          </Reveal>

          <div className="space-y-6">
            {dna.slice(2, 4).map((d, i) => (
              <Reveal key={d.title} delay={i * 0.05}>
                <div className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-card">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand-soft text-brand-2">
                    <d.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold">{d.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{d.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
