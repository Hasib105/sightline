"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion, type MotionValue, useScroll, useTransform } from "framer-motion";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { GradientPill } from "@/components/motion/GradientPill";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const cols = [
  {
    title: "Product",
    items: [
      { label: "Overview", to: "/" },
      { label: "Docs", to: "/dashboard/docs" },
      { label: "Status", to: "/status" },
    ],
  },
  {
    title: "Workflows",
    items: [
      { label: "Video review", to: "/#workflows" },
      { label: "Architecture", to: "/#architecture" },
      { label: "Alert evidence", to: "/#workflows" },
      { label: "ProcBot later", to: "/#workflows" },
    ],
  },
  {
    title: "Resources",
    items: [
      { label: "Product docs", to: "/dashboard/docs" },
      { label: "Operations", to: "/status" },
      { label: "Dashboard", to: "/dashboard" },
      { label: "Admin", to: "/admin" },
    ],
  },
] as const;

function FooterWordmarkLetter({
  index,
  isReady,
  progress,
  value,
}: {
  index: number;
  isReady: boolean;
  progress: MotionValue<number>;
  value: string;
}) {
  const start = 0.12 + index * 0.055;
  const end = Math.min(0.92, start + 0.36);
  const opacity = useTransform(progress, [start, end], [0.16, 0.62]);
  const y = useTransform(progress, [start, end], [96, 0]);
  const rotate = useTransform(progress, [start, end], [8, 0]);

  return (
    <motion.span
      className="inline-block"
      style={isReady ? { opacity, rotate, y } : { opacity: 0.58 }}
    >
      <span className="footer-wordmark-letter inline-block text-gradient-brand" style={{ "--letter-index": index } as CSSProperties}>
        {value}
      </span>
    </motion.span>
  );
}

export function SiteFooter() {
  const footerRef = useRef<HTMLElement>(null);
  const [isReady, setIsReady] = useState(false);
  const { scrollYProgress } = useScroll({
    target: footerRef,
    offset: ["start end", "end end"],
  });
  
  const scale = useTransform(scrollYProgress, [0, 0.55, 1], [0.9, 0.98, 1.02]);
  const blur = useTransform(scrollYProgress, [0, 0.45, 1], ["blur(6px)", "blur(1px)", "blur(0px)"]);
  const letters = "sightline".split("");

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <footer ref={footerRef} className="relative overflow-hidden border-t border-border bg-background">
      <div className="container mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Sightline</h2>
            <p className="mt-2 text-muted-foreground">Uploaded exam videos, AI-assisted alerts, and human-reviewed evidence in one workspace.</p>
          </div>
          <div className="flex items-start justify-start gap-6 lg:justify-end">
            <div>
              <p className="font-display text-xl font-semibold sm:text-2xl">Ready to run the prototype?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Seed demo data and open the MVP workspace.
              </p>
            </div>
            <Link href="/register" className="inline-flex">
              <GradientPill variant="fill">Open app</GradientPill>
            </Link>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-10 sm:grid-cols-4">
          {cols.map((c) => (
            <div key={c.title}>
              <p className="text-sm font-semibold text-foreground">{c.title}</p>
              <ul className="mt-4 space-y-3">
                {c.items.map((it) => (
                  <li key={it.label}>
                    <Link href={it.to} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {it.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-6 border-t border-border pt-8 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">© 2026 Sightline. Prototype scaffold.</p>
          <div className="flex items-center gap-4 text-sm">
            <a href="https://github.com/Hasib105" className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground">
              GitHub <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <div className="ml-2">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* Watermark wordmark with motion */}
      <div aria-hidden className="pointer-events-none select-none overflow-hidden">
        <motion.p 
          className="px-4 text-center font-display text-[22vw] font-extrabold leading-none sm:text-[18vw]"
          style={isReady ? { filter: blur, scale } : undefined}
        >
          {letters.map((letter, index) => (
            <FooterWordmarkLetter
              key={`${letter}-${index}`}
              index={index}
              isReady={isReady}
              progress={scrollYProgress}
              value={letter}
            />
          ))}
        </motion.p>
      </div>
    </footer>
  );
}
