"use client";

import { Reveal } from "@/components/motion/Reveal";
import { GradientText } from "@/components/motion/GradientText";
import { features } from "@/data/features";
import { cn } from "@/lib/utils";

export function FeatureBento() {
  return (
    <section className="container mx-auto max-w-7xl px-6 py-24 sm:py-32">
      <Reveal className="mx-auto max-w-5xl text-center">
        <h2 className="font-display text-[clamp(2rem,4.25vw,3.75rem)] font-extrabold leading-[1.05] tracking-tight sm:whitespace-nowrap">
          A smaller MVP for <GradientText>exam review</GradientText>
        </h2>
        <p className="mt-4 text-muted-foreground sm:text-lg">
          Sightline now focuses on the shortest useful path: video upload, analysis job, alert evidence, and
          invigilator review.
        </p>
      </Reveal>

      <div className="mt-14 grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <Reveal
            key={f.title}
            delay={i * 0.05}
            className={cn(f.accent === "wide" && "lg:col-span-2")}
          >
            <div className="group relative h-full overflow-hidden rounded-2xl border border-border-subtle bg-surface p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-float">
              <div
                aria-hidden
                className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-brand opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-30"
              />
              <div className="relative">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand-soft text-brand-2">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-lg font-bold sm:text-xl">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground sm:text-[15px]">{f.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
