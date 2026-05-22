import type { Metadata } from "next";
import { Activity, CheckCircle2, Clock3, Database, Globe2 } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { MarketingCard, MarketingHero, MiniMetric } from "@/components/marketing/MarketingPage";
import { Reveal } from "@/components/motion/Reveal";
import { FinalCta } from "@/components/sections/FinalCta";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Sightline status | API, live alerts, jobs, and inference",
  description:
    "Check the prototype status for the Django API, dashboard, live alert stream, background jobs, and inference worker.",
  path: "/status",
  keywords: [
    "operations platform status",
    "Sightline uptime",
    "exam monitoring status",
  ],
});

const systems = [
  { name: "Django API", detail: "Personas, alerts, analytics, schedules, reminders, and operator health.", icon: Activity },
  { name: "Dashboard", detail: "Invigilator, faculty, student, and operator views.", icon: Globe2 },
  { name: "Live alert stream", detail: "Django Channels WebSocket fan-out for active exam monitoring.", icon: Database },
  { name: "Background jobs", detail: "Celery-style imports, risk calculation, reminders, and post-processing.", icon: Clock3 },
];

export default function StatusPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-background text-foreground">
        <MarketingHero
          eyebrow="Status"
          title="All systems"
          gradient="operational"
          description="A simple operational snapshot for the local Sightline prototype."
        />

        <section className="container mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <Reveal>
            <div className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-card sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-gradient-brand-soft px-4 py-2 text-sm font-bold">
                    <CheckCircle2 className="h-4 w-4 text-brand-1" />
                    Operational
                  </div>
                  <h2 className="mt-5 font-display text-3xl font-extrabold sm:text-5xl">
                    Sightline is healthy.
                  </h2>
                  <p className="mt-3 max-w-2xl text-muted-foreground">
                    This page is a static marketing status summary. Incident-level monitoring can be wired in when a live public status source is available.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:w-[28rem]">
                  <MiniMetric label="API" value="Live" />
                  <MiniMetric label="Alerts" value="Live" />
                  <MiniMetric label="Jobs" value="Ready" />
                </div>
              </div>
            </div>
          </Reveal>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {systems.map((system, index) => (
              <Reveal key={system.name} delay={index * 0.05}>
                <MarketingCard icon={system.icon} title={system.name}>
                  <p>{system.detail}</p>
                  <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-brand-1" />
                    Operational
                  </p>
                </MarketingCard>
              </Reveal>
            ))}
          </div>
        </section>

        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
