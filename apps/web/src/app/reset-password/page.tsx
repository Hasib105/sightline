import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";

import { PasswordResetForm } from "@/components/auth/password-reset-form";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { GradientPill } from "@/components/motion/GradientPill";

export const metadata: Metadata = {
  title: "Reset Password | Sightline Console",
  description: "Password recovery guidance for Sightline account access.",
};

export default function ResetPasswordPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-background text-foreground">
        <section className="container mx-auto grid max-w-6xl gap-8 px-6 pb-16 pt-32 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-border-subtle bg-surface p-8 shadow-card">
            <div aria-hidden className="absolute inset-0 bg-gradient-brand-soft opacity-60" />
            <div className="relative">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border-subtle bg-background/80 text-brand-1">
                <KeyRound className="h-5 w-5" />
              </span>
              <h1 className="mt-8 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
                Recover access without losing the plot.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">
                Tell us the email on your account. Sightline will return the right recovery guidance
                for password or provider-backed access.
              </p>
              <div className="mt-8 grid gap-3 text-sm text-muted-foreground">
                {["Existing reset API", "Provider-friendly messaging", "No account details exposed"].map((item) => (
                  <p key={item} className="inline-flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-brand-1" />
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-border-subtle bg-surface/92 p-4 shadow-float backdrop-blur">
            <div className="rounded-[1.35rem] border border-border-subtle bg-background/80 p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gradient-brand">
                Password reset
              </p>
              <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight">
                Request recovery link
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                If your account uses a provider, we will point you back to that provider recovery
                flow. If password reset is enabled, you will get the next step.
              </p>
              <div className="mt-6">
                <PasswordResetForm />
              </div>
              <div className="mt-6 flex flex-wrap gap-3 border-t border-border-subtle pt-5">
                <Link href="/login" className="inline-block">
                  <GradientPill variant="outline">
                    <ArrowLeft className="h-4 w-4" /> Back to login
                  </GradientPill>
                </Link>
                <Link href="/register" className="inline-block">
                  <GradientPill variant="fill">Create account</GradientPill>
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
