import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { GradientPill } from "@/components/motion/GradientPill";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-background text-foreground">
        <section className="container mx-auto flex min-h-[72vh] max-w-5xl items-center px-6 py-32">
          <div className="relative w-full overflow-hidden rounded-[2rem] border border-border-subtle bg-surface p-8 text-center shadow-float sm:p-12">
            <div aria-hidden className="absolute inset-0 bg-gradient-brand-soft opacity-60" />
            <div className="relative mx-auto max-w-2xl">
              <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border-subtle bg-background/85 text-brand-1">
                <Compass className="h-6 w-6" />
              </span>
              <p className="mt-6 text-xs font-bold uppercase tracking-[0.24em] text-gradient-brand">
                404
              </p>
              <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
                This route drifted off course.
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-muted-foreground">
                The page may have moved, or the link may be old. The main site is still right where
                it should be.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/" className="inline-block">
                  <GradientPill variant="fill">
                    <ArrowLeft className="h-4 w-4" /> Back home
                  </GradientPill>
                </Link>
                <Link href="/register" className="inline-block">
                  <GradientPill variant="outline">Get started</GradientPill>
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
