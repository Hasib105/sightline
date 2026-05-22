import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface MarqueeRowProps {
  children: ReactNode;
  className?: string;
  speed?: "normal" | "slow";
  reverse?: boolean;
}

export function MarqueeRow({ children, className, speed = "normal", reverse }: MarqueeRowProps) {
  return (
    <div className={cn("marquee-mask overflow-hidden", className)}>
      <div
        className={cn(
          "flex w-max transform-gpu will-change-transform",
          speed === "slow" ? "[animation:marquee_60s_linear_infinite]" : "[animation:marquee_35s_linear_infinite]",
          reverse && "[animation-direction:reverse]",
        )}
      >
        <div className="flex shrink-0 items-center gap-12 pr-12">{children}</div>
        <div aria-hidden className="flex shrink-0 items-center gap-12 pr-12">{children}</div>
      </div>
    </div>
  );
}
