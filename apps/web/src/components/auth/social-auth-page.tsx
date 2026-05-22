import Link from "next/link";
import { CheckCircle2, Code2, ShieldCheck, Sparkles } from "lucide-react";

import { PasswordAuthForm } from "@/components/auth/password-auth-form";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { type SocialAuthProcess } from "@/lib/social-auth";

type SocialAuthPageProps = {
  mode: SocialAuthProcess;
};

const authContent: Record<
  SocialAuthProcess,
  {
    headline: string;
    description: string;
    kicker: string;
    toggleHref: string;
    toggleLabel: string;
  }
> = {
  login: {
    headline: "Sign in to Sightline",
    description:
      "Use one of the seeded MVP accounts to open the dashboard. The rest of setup stays in Django admin for now.",
    kicker: "MVP login",
    toggleHref: "/dashboard",
    toggleLabel: "Open dashboard",
  },
  signup: {
    headline: "Create your Sightline account",
    description:
      "Start with launch credits, create API keys, and move into the dashboard without a sales handoff.",
    kicker: "Get started",
    toggleHref: "/login",
    toggleLabel: "Already have an account? Sign in",
  },
};

export function SocialAuthPage({ mode }: SocialAuthPageProps) {
  const content = authContent[mode];

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen overflow-hidden bg-background text-foreground">
        <section className="container relative mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 px-6 pb-14 pt-28 lg:grid-cols-[0.92fr_0.8fr]">
          <div aria-hidden className="absolute inset-x-6 top-24 h-52 rounded-full bg-gradient-brand-soft blur-3xl" />
          <div className="relative">
            <span className="pill-outline inline-flex items-center gap-2 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-1" />
              <span className="text-gradient-brand">{content.kicker}</span>
            </span>
            <h1 className="mt-5 max-w-3xl font-display text-4xl font-extrabold leading-[1.04] tracking-tight sm:text-5xl">
              {content.headline}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              {content.description}
            </p>

            <div className="mt-8 max-w-xl overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-card">
              <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-[#ef5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#f4bf4f]" />
                <span className="h-3 w-3 rounded-full bg-[#61c454]" />
                <span className="ml-3 text-xs font-bold text-muted-foreground">auth.sightline</span>
              </div>
              <div className="grid gap-3 p-4 text-sm leading-6 text-muted-foreground sm:grid-cols-3">
                <div>
                  <p className="font-display text-2xl font-extrabold text-foreground">4</p>
                  <p>MVP roles</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-extrabold text-foreground">Fast</p>
                  <p>seeded login</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-extrabold text-foreground">29</p>
                  <p>demo users</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[1.4rem] border border-border-subtle bg-surface/92 p-3 shadow-float backdrop-blur">
              <div className="rounded-xl border border-border-subtle bg-background/80 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="inline-flex items-center gap-2 rounded-full bg-gradient-brand-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Sightline Console
                    </p>
                    <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight">
                      {mode === "login" ? "Welcome back" : "Create account"}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {mode === "login"
                        ? "Sign in with the credentials for your Sightline account."
                        : "Sign up with email and password to start using Sightline."}
                    </p>
                  </div>
                  <span className="hidden h-10 w-10 items-center justify-center rounded-xl border border-border-subtle bg-surface text-brand-1 sm:inline-flex">
                    <Code2 className="h-5 w-5" />
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  <PasswordAuthForm mode={mode} />
                  {mode === "login" ? null : null}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4 text-sm font-bold">
                  {mode === "login" ? null : (
                    <Link href={content.toggleHref} className="text-gradient-brand">
                      {content.toggleLabel}
                    </Link>
                  )}
                  {mode === "login" ? (
                    <Link href="/reset-password" className="text-muted-foreground transition-colors hover:text-foreground">
                      Forgot password?
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 text-xs font-semibold text-muted-foreground sm:grid-cols-3">
              {["admin / sightline", "teacher / sightline", "student / sightline"].map((item) => (
                <span key={item} className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-3 py-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-1" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
