"use client";

import { ArrowRight, BookOpen, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { GradientPill } from "@/components/motion/GradientPill";
import { GradientText } from "@/components/motion/GradientText";
import { AnimatedTerminal } from "@/components/motion/AnimatedTerminal";
import { Reveal } from "@/components/motion/Reveal";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 sm:pt-36">
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-radial-soft" />
        <div className="absolute inset-x-0 top-0 h-[480px] grid-bg opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      </div>

      <div className="container mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <div className="pill-outline mx-auto inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold relative">
              <span className="absolute inset-0 rounded-full bg-gradient-brand opacity-10 blur-xl" aria-hidden />
              <ShieldCheck className="relative z-10 h-4 w-4 text-brand-2" />
              <span className="text-gradient-brand relative z-10">AI-assisted exam integrity</span>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Upload exam videos,
              <br />
              <GradientText>reviewable alerts.</GradientText>
            </h1>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Sightline helps teachers upload exam videos, queues analysis in the background, and gives invigilators
              evidence-backed alerts to review. Live cameras and ProcBot come later.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="mt-8 flex flex-row flex-wrap items-center justify-center gap-2.5 sm:gap-3">
              <Link href="/register" className="shrink-0">
                <GradientPill variant="fill" className="px-5 py-3 text-sm sm:px-7 sm:py-3.5">
                  Open workspace <ArrowRight className="h-4 w-4" />
                </GradientPill>
              </Link>
              <Link
                href="/docs/product"
                className="inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-foreground/80 transition-colors hover:text-foreground sm:px-5"
              >
                <BookOpen className="h-4 w-4" /> Product docs
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="mt-6 text-xs text-muted-foreground">
              Django API · Video analysis jobs · Evidence review · ProcBot roadmap
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.25} className="mx-auto mt-14 max-w-6xl">
          <AnimatedTerminal />
        </Reveal>
      </div>
    </section>
  );
}
