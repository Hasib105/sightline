import { cn } from "@/lib/utils";
import type { SocialProviderId } from "@/lib/social-auth";

type ProviderIconProps = {
  providerId: SocialProviderId;
  className?: string;
};

const providerBadgeStyles: Record<SocialProviderId, { label: string; style: string }> = {
  google: {
    label: "G",
    style: "bg-[#4285F4] text-white",
  },
  microsoft: {
    label: "M",
    style: "bg-[#f3f4f6] text-slate-800 ring-1 ring-slate-200",
  },
  github: {
    label: "GH",
    style: "bg-slate-900 text-white",
  },
};

export function ProviderIcon({ providerId, className }: ProviderIconProps) {
  const badge = providerBadgeStyles[providerId];

  return (
    <span
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold tracking-tight",
        badge.style,
        className
      )}
      aria-hidden
    >
      {badge.label}
    </span>
  );
}
