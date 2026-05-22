"use client";

import Link from "next/link";
import { AlertCircle, RefreshCcw } from "lucide-react";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { GradientPill } from "@/components/motion/GradientPill";

export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-background text-foreground">
        <section className="container mx-auto flex min-h-[72vh] max-w-5xl items-center px-6 py-32">
          <div className="relative w-full overflow-hidden rounded-[2rem] border border-border-subtle bg-surface p-8 text-center shadow-float sm:p-12">
            <div aria-hidden className="absolute inset-0 bg-gradient-brand-soft opacity-60" />
            <div className="relative mx-auto max-w-2xl">
              <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border-subtle bg-background/85 text-amber-500">
                <AlertCircle className="h-6 w-6" />
              </span>
              <p className="mt-6 text-xs font-bold uppercase tracking-[0.24em] text-gradient-brand">
                Something snapped
              </p>
              <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
                The page hit rough water.
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-muted-foreground">
                Try the page again. If it keeps happening, send us the route and we will trace it
                through the logs.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <GradientPill type="button" variant="fill" onClick={reset}>
                  <RefreshCcw className="h-4 w-4" /> Try again
                </GradientPill>
                <Link href="/" className="inline-block">
                  <GradientPill variant="outline">Back home</GradientPill>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
