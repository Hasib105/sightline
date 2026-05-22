import Link from "next/link";
import { ShieldCheck } from "lucide-react";

type SightlineBrandProps = {
  href?: string;
  compact?: boolean;
  iconOnly?: boolean;
};

export function SightlineBrand({ href = "/", compact = false, iconOnly = false }: SightlineBrandProps) {
  return (
    <Link
      href={href}
      className={`flex min-w-0 items-center ${compact ? "gap-2" : "gap-2.5"}`}
      aria-label="Sightline"
    >
      <span
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--dashboard-border)] bg-card shadow-sm ${
          compact ? "size-8" : "size-9"
        }`}
      >
        <ShieldCheck className="size-[68%] text-brand-2" />
      </span>
      {iconOnly ? null : (
        <span
          className={`min-w-0 truncate font-heading font-semibold tracking-normal text-foreground ${
            compact ? "text-base" : "text-lg"
          }`}
        >
          Sightline
        </span>
      )}
    </Link>
  );
}
