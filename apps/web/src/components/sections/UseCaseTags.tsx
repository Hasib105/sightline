"use client";

import { motion } from "framer-motion";
import { Bell, BriefcaseBusiness, Database, Megaphone, Sparkles, Upload, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { GradientText } from "@/components/motion/GradientText";
import { cn } from "@/lib/utils";

type FloatingItem =
  | {
      kind: "pill";
      label: string;
      icon?: never;
      className: string;
      color: string;
      rotate: number;
    }
  | {
      kind: "icon";
      label: string;
      icon: LucideIcon;
      className: string;
      color: string;
      rotate: number;
    };

const floatingItems: FloatingItem[] = [
  {
    kind: "pill",
    label: "Exam sessions",
    className: "left-[7%] top-[7%]",
    color: "text-[hsl(281_45%_58%)]",
    rotate: 7,
  },
  {
    kind: "icon",
    label: "Review alerts",
    icon: Bell,
    className: "left-[39%] top-[7%]",
    color: "text-[hsl(12_88%_66%)]",
    rotate: -10,
  },
  {
    kind: "icon",
    label: "Teacher upload",
    icon: BriefcaseBusiness,
    className: "right-[22%] top-[8%]",
    color: "text-[hsl(204_70%_55%)]",
    rotate: 8,
  },
  {
    kind: "pill",
    label: "Student context",
    className: "right-[8%] top-[19%]",
    color: "text-[hsl(334_76%_61%)]",
    rotate: 6,
  },
  {
    kind: "icon",
    label: "Video files",
    icon: Upload,
    className: "-left-[1%] top-[49%]",
    color: "text-[hsl(284_64%_72%)]",
    rotate: -12,
  },
  {
    kind: "pill",
    label: "Seat maps",
    className: "left-[10%] bottom-[16%]",
    color: "text-[hsl(210_64%_52%)]",
    rotate: -8,
  },
  {
    kind: "pill",
    label: "Evidence clips",
    className: "left-[36%] bottom-[8%]",
    color: "text-[hsl(352_78%_62%)]",
    rotate: 8,
  },
  {
    kind: "icon",
    label: "Analysis jobs",
    icon: Database,
    className: "left-[57%] bottom-[18%]",
    color: "text-[hsl(326_70%_68%)]",
    rotate: 8,
  },
  {
    kind: "pill",
    label: "ProcBot later",
    className: "right-[8%] bottom-[14%]",
    color: "text-[hsl(14_86%_58%)]",
    rotate: -8,
  },
  {
    kind: "icon",
    label: "Admin setup",
    icon: Megaphone,
    className: "left-[53%] top-[25%]",
    color: "text-[hsl(184_72%_47%)]",
    rotate: -4,
  },
];

function FloatingUseCase({ isReady, item, index }: { isReady: boolean; item: FloatingItem; index: number }) {
  const Icon = item.kind === "icon" ? item.icon : null;

  return (
    <motion.div
      data-usecase-float
      initial={isReady ? { opacity: 0, y: 28, scale: 0.92, rotate: item.rotate - 4 } : false}
      whileInView={isReady ? { opacity: 1, y: 0, scale: 1, rotate: item.rotate } : undefined}
      viewport={{ once: true, amount: 0.7 }}
      transition={{ delay: index * 0.07, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className={cn("absolute", item.className)}
    >
      {item.kind === "pill" ? (
        <div
          className={cn(
            "rounded-full border border-white/65 bg-white/85 px-7 py-3 text-2xl font-medium tracking-normal shadow-[0_18px_54px_-32px_hsl(var(--foreground)/0.45)] backdrop-blur-md",
            item.color,
          )}
        >
          {item.label}
        </div>
      ) : (
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/82 shadow-[0_18px_50px_-30px_hsl(var(--foreground)/0.5)] backdrop-blur-md">
          {Icon ? <Icon className={cn("h-7 w-7", item.color)} strokeWidth={2.2} /> : null}
        </div>
      )}
    </motion.div>
  );
}

function MobileUseCase({ isReady, item, index }: { isReady: boolean; item: FloatingItem; index: number }) {
  const Icon = item.kind === "icon" ? item.icon : Sparkles;

  return (
    <motion.div
      initial={isReady ? { opacity: 0, y: 18 } : false}
      whileInView={isReady ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, amount: 0.8 }}
      transition={{ delay: index * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-5 py-3 shadow-card"
    >
      <Icon className={cn("h-4 w-4", item.color)} />
      <span className={cn("text-sm font-bold", item.color)}>{item.label}</span>
    </motion.div>
  );
}

export function UseCaseTags() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section className="overflow-hidden px-6 py-24 sm:py-32">
      <div className="relative mx-auto max-w-7xl">
        <div className="relative hidden min-h-[560px] sm:block">
          {floatingItems.map((item, index) => (
            <FloatingUseCase key={item.label} isReady={isReady} item={item} index={index} />
          ))}

          <motion.div
            initial={isReady ? { opacity: 0, y: 24 } : false}
            whileInView={isReady ? { opacity: 1, y: 0 } : undefined}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 text-center"
          >
            <h2 className="font-display text-[clamp(2.75rem,5.25vw,5.25rem)] font-extrabold leading-none tracking-tight text-foreground">
              Built for exam review
            </h2>
          </motion.div>
        </div>

        <div className="sm:hidden">
          <div className="text-center">
            <h2 className="font-display text-3xl font-extrabold leading-tight">
              Built for <GradientText>exam review</GradientText>
            </h2>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {floatingItems.map((item, index) => (
              <MobileUseCase key={item.label} isReady={isReady} item={item} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
