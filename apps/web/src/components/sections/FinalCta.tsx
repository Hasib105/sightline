"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Mail, Sparkles } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { GradientPill } from "@/components/motion/GradientPill";
import { GradientText } from "@/components/motion/GradientText";

const proof = ["Human review stays central", "Evidence-backed alerts", "Runs with the local Django API"];

export function FinalCta() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const query = trimmedEmail ? `?email=${encodeURIComponent(trimmedEmail)}` : "";
    router.push(`/register${query}`);
  }

  return (
    <section id="cta" className="container mx-auto max-w-6xl px-6 py-16 sm:py-24">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2rem] border border-border-subtle bg-surface px-6 py-10 text-center text-foreground shadow-[0_28px_90px_-70px_hsl(var(--foreground)/0.48)] dark:border-white/10 dark:bg-[#071418] dark:text-white dark:shadow-[0_34px_110px_-72px_hsl(200_95%_45%/0.75)] sm:px-10 sm:py-12 lg:px-14">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(184_85%_55%/0.13),transparent_42%),linear-gradient(180deg,hsl(0_0%_100%/0.62),transparent_44%)] dark:bg-[radial-gradient(circle_at_50%_0%,hsl(184_85%_55%/0.18),transparent_38%),linear-gradient(180deg,hsl(0_0%_100%/0.045),transparent_44%)]"
          />
          <div
            aria-hidden
            className="absolute left-1/2 top-0 h-px w-3/5 -translate-x-1/2 bg-gradient-to-r from-transparent via-brand-1 to-transparent opacity-80"
          />
          <div aria-hidden className="absolute -left-20 bottom-8 h-40 w-40 rounded-full bg-brand-1/10 blur-3xl dark:bg-brand-1/10" />
          <div aria-hidden className="absolute -right-24 top-8 h-48 w-48 rounded-full bg-brand-2/10 blur-3xl dark:bg-brand-2/12" />

          <div className="relative mx-auto flex max-w-3xl flex-col items-center">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle bg-background/75 text-brand-1 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.75)] dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[inset_0_1px_0_hsl(0_0%_100%/0.14)]">
              <Sparkles className="h-[18px] w-[18px]" />
            </span>

            <h2 className="mt-5 max-w-3xl font-display text-3xl font-extrabold leading-[1.06] tracking-tight sm:text-4xl lg:text-5xl">
              Give exam teams a <GradientText>shared operating picture.</GradientText>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground dark:text-white/62">
              Run the prototype, review live alerts, seed demo academic data, and explore the same workflows described
              in the product requirements.
            </p>

            <form
              className="mt-6 flex w-full max-w-xl flex-col gap-3 rounded-[1.75rem] border border-border-subtle bg-background/75 p-2 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.85),0_20px_62px_-54px_hsl(184_85%_45%/0.7)] backdrop-blur dark:border-white/10 dark:bg-white/[0.055] dark:shadow-[inset_0_1px_0_hsl(0_0%_100%/0.1),0_24px_70px_-52px_hsl(184_85%_55%/0.8)] sm:flex-row sm:rounded-full"
              onSubmit={onSubmit}
            >
              <label htmlFor="cta-email" className="sr-only">
                Work email
              </label>
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-full px-4">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground dark:text-white/45" />
                <input
                  id="cta-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus-visible:outline-none dark:text-white dark:placeholder:text-white/38"
                />
              </div>
              <GradientPill variant="fill" type="submit" className="h-11 w-full px-6 sm:w-auto">
                Open workspace <ArrowRight className="h-4 w-4" />
              </GradientPill>
            </form>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-semibold text-muted-foreground dark:text-white/58">
              {proof.map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-1" />
                  {item}
                </span>
              ))}
            </div>

            <p className="mt-3 text-xs text-muted-foreground/80 dark:text-white/42">
              Sightline flags suspicious behavior for review. It does not issue cheating verdicts.
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
