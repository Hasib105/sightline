import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, RotateCcw } from "lucide-react";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { GradientPill } from "@/components/motion/GradientPill";

export const metadata: Metadata = {
  title: "Authentication Error | Sightline Console",
  description: "Provider authentication error page for Sightline operators.",
};

export default function AuthErrorPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-background text-foreground">
        <section className="container mx-auto max-w-5xl px-6 pb-16 pt-32">
          <div className="relative overflow-hidden rounded-[2rem] border border-border-subtle bg-surface p-6 shadow-float sm:p-10">
            <div aria-hidden className="absolute inset-0 bg-gradient-brand-soft opacity-55" />
            <div className="relative mx-auto max-w-3xl text-center">
              <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border-subtle bg-background/85 text-amber-500">
                <AlertTriangle className="h-6 w-6" />
              </span>
              <p className="mt-6 text-xs font-bold uppercase tracking-[0.22em] text-gradient-brand">
                Auth interrupted
              </p>
              <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
                The provider handoff did not land.
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
                The account is probably fine. Retry the provider flow, use password access, or
                request recovery if your credentials need a reset.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/login" className="inline-block">
                  <GradientPill variant="fill">
                    <RotateCcw className="h-4 w-4" /> Try login again
                  </GradientPill>
                </Link>
                <Link href="/register" className="inline-block">
                  <GradientPill variant="outline">
                    Create account <ArrowRight className="h-4 w-4" />
                  </GradientPill>
                </Link>
                <Link href="/reset-password" className="inline-block">
                  <GradientPill variant="outline">Reset password</GradientPill>
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
