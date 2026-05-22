import { ClipboardCheck, GraduationCap, HeartPulse, type LucideIcon, ShieldAlert, Upload, UsersRound } from "lucide-react";
import { MarqueeRow } from "@/components/motion/MarqueeRow";
import { trustedBy } from "@/data/features";

const icons: LucideIcon[] = [ShieldAlert, Upload, GraduationCap, UsersRound, HeartPulse];

const brandIcons: Partial<Record<(typeof trustedBy)[number], LucideIcon>> = {
  Invigilators: ShieldAlert,
  Teachers: GraduationCap,
  Students: GraduationCap,
  Admins: UsersRound,
  "Exam Teams": UsersRound,
  "Video Uploads": Upload,
  "Analysis Jobs": ClipboardCheck,
  "Alert Review": ShieldAlert,
  "Evidence Review": ShieldAlert,
  "ProcBot Roadmap": ClipboardCheck,
};

function BrandIcon({ name }: { name: (typeof trustedBy)[number] }) {
  const Icon = brandIcons[name] ?? icons[name.length % icons.length];

  return <Icon aria-hidden="true" className="h-full w-full text-foreground/70" />;
}

export function LogoMarquee() {
  return (
    <section className="mt-16 border-y border-border-subtle bg-surface/60 py-14 sm:mt-20 sm:py-16">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Built around the people who run exam review
        </p>
        <MarqueeRow className="mt-8" speed="slow">
          {trustedBy.map((company) => (
            <span
              key={company}
              className="inline-flex items-center gap-3 font-display text-2xl font-bold tracking-tight text-foreground/45 sm:text-3xl"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle bg-background/80 p-2 shadow-card">
                <BrandIcon name={company} />
              </span>
              {company}
            </span>
          ))}
        </MarqueeRow>
    </section>
  );
}
