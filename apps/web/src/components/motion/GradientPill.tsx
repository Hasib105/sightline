import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

interface GradientPillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "outline" | "fill";
  asChild?: boolean;
}

export const GradientPill = forwardRef<HTMLButtonElement, GradientPillProps>(
  ({ className, variant = "outline", children, ...props }, ref) => {
    if (variant === "fill") {
      return (
        <button
          ref={ref}
          className={cn(
            "relative isolate inline-flex items-center justify-center gap-2 overflow-hidden rounded-full px-6 py-3 text-sm font-semibold text-white shadow-pill transition-all hover:-translate-y-0.5 active:translate-y-0 hover:shadow-[0_0_40px_hsl(184_85%_55%/0.4),0_0_60px_hsl(200_95%_50%/0.3)]",
            "bg-gradient-brand",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            className,
          )}
          {...props}
        >
          <span className="absolute inset-0 rounded-full bg-gradient-brand opacity-50 blur-xl" aria-hidden />
          <span className="relative z-10 flex items-center gap-2">{children}</span>
        </button>
      );
    }
    return (
      <button
        ref={ref}
        className={cn(
          "pill-outline inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:shadow-[0_0_30px_hsl(184_85%_55%/0.2)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
GradientPill.displayName = "GradientPill";
