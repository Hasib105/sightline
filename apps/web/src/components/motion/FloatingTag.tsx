"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface FloatingTagProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  rotate?: number;
}

export function FloatingTag({ children, className, delay = 0, rotate = 0 }: FloatingTagProps) {
  const reduced = useReducedMotion();
  const floatDuration = 6 + ((Math.abs(rotate) * 0.17 + delay * 10) % 2);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      animate={
        reduced
          ? undefined
          : { y: [0, -8, 0, 6, 0], rotate: [rotate, rotate + 1, rotate, rotate - 1, rotate] }
      }
      style={{ rotate: `${rotate}deg` }}
      {...(reduced
        ? {}
        : { transition: { repeat: Infinity, duration: floatDuration, ease: "easeInOut", delay } })}
      className={cn(
        "rounded-full bg-surface px-5 py-2.5 text-sm font-semibold shadow-card border border-border-subtle",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
