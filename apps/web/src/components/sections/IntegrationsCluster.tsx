"use client";

import { Camera, Database, RadioTower, ServerCog, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { GradientText } from "@/components/motion/GradientText";
import { integrations } from "@/data/features";

const icons = [ShieldCheck, RadioTower, Database, Camera, ServerCog];

export function IntegrationsCluster() {
  return (
    <section className="overflow-hidden px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <Reveal className="mx-auto max-w-5xl text-center">
          <h2 className="font-display text-[clamp(2rem,4.2vw,3.75rem)] font-extrabold leading-[1.05] tracking-tight sm:whitespace-nowrap">
            Architecture that matches <GradientText>the repo</GradientText>
          </h2>
          <p className="mt-5 text-muted-foreground sm:text-lg">
            The frontend reflects the actual monorepo: Django APIs, Channels alerts, Celery jobs, Redis/PostgreSQL,
            React/Next.js, and a separate inference worker.
          </p>
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {integrations.map((name, index) => {
            const Icon = icons[index % icons.length];
            return (
              <Reveal key={name} delay={index * 0.04}>
                <div className="flex min-h-32 flex-col items-center justify-center rounded-2xl border border-border-subtle bg-surface p-5 text-center shadow-card">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand-soft text-brand-2">
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="mt-4 font-display text-sm font-bold text-foreground">{name}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
