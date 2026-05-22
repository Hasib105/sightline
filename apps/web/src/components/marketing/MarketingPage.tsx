import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { GradientText } from "@/components/motion/GradientText";
import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";

export function MarketingHero({
  eyebrow,
  title,
  gradient,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  gradient?: string;
  description: string;
  align?: "center" | "left";
}) {
  return (
    <section className="container mx-auto max-w-7xl px-6 pt-32 sm:pt-36">
      <Reveal
        className={cn(
          align === "center" ? "mx-auto max-w-4xl text-center" : "max-w-3xl",
        )}
      >
        <span className="pill-outline inline-flex px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em]">
          <span className="text-gradient-brand">{eyebrow}</span>
        </span>
        <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">
          {title}
          {gradient ? (
            <>
              {" "}
              <GradientText>{gradient}</GradientText>
            </>
          ) : null}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          {description}
        </p>
      </Reveal>
    </section>
  );
}

export function MarketingSection({
  eyebrow,
  title,
  gradient,
  description,
}: {
  eyebrow?: string;
  title: string;
  gradient?: string;
  description?: string;
}) {
  return (
    <Reveal className="mx-auto max-w-4xl text-center">
      {eyebrow ? (
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
        {title}
        {gradient ? (
          <>
            {" "}
            <GradientText>{gradient}</GradientText>
          </>
        ) : null}
      </h2>
      {description ? (
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          {description}
        </p>
      ) : null}
    </Reveal>
  );
}

export function MarketingCard({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative h-full overflow-hidden rounded-2xl border border-border-subtle bg-surface p-6 shadow-card",
        "transition-all duration-300 hover:-translate-y-1 hover:shadow-float",
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,hsl(184_85%_55%/0.08),transparent_38%)] opacity-80"
      />
      <div className="relative">
        {Icon ? (
          <span className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand-soft text-foreground ring-1 ring-border-subtle/70">
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
        <h3 className="font-display text-xl font-bold tracking-tight">{title}</h3>
        <div className="mt-3 text-sm leading-7 text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

export function MarketingLinkCard({
  href,
  title,
  description,
  meta,
}: {
  href: string;
  title: string;
  description: string;
  meta?: string;
}) {
  return (
    <Link
      href={href}
      className="group relative block h-full overflow-hidden rounded-2xl border border-border-subtle bg-surface p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-float"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,hsl(184_85%_55%/0.1),transparent_40%)] opacity-80"
      />
      <div className="relative flex h-full flex-col">
        {meta ? <p className="text-xs font-bold uppercase tracking-[0.2em] text-gradient-brand">{meta}</p> : null}
        <div className="mt-3 flex items-start justify-between gap-4">
          <h3 className="font-display text-xl font-bold tracking-tight">{title}</h3>
          <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
        </div>
        <p className="mt-3 flex-1 text-sm leading-7 text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}

export function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface/80 px-5 py-4 shadow-card">
      <p className="font-display text-2xl font-extrabold text-gradient-brand">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
