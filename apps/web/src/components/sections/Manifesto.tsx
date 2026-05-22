"use client";

import { motion, type MotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

type ManifestoToken =
  | {
      kind: "word";
      text: string;
    }
  | {
      kind: "emoji";
      label: string;
      text: string;
    };

const manifestoLines: ManifestoToken[][] = [
  [
    { kind: "word", text: "At" },
    { kind: "word", text: "Sightline," },
    { kind: "word", text: "AI" },
    { kind: "word", text: "does" },
    { kind: "word", text: "not" },
    { kind: "word", text: "replace" },
    { kind: "word", text: "academic" },
    { kind: "word", text: "judgment." },
    { kind: "emoji", text: "🛡️", label: "shield" },
  ],
  [
    { kind: "word", text: "We" },
    { kind: "word", text: "surface" },
    { kind: "word", text: "suspicion," },
    { kind: "word", text: "evidence," },
    { kind: "word", text: "and" },
    { kind: "word", text: "context" },
    { kind: "word", text: "so" },
    { kind: "word", text: "invigilators" },
    { kind: "word", text: "can" },
    { kind: "word", text: "review" },
    { kind: "word", text: "with" },
    { kind: "word", text: "confidence." },
  ],
  [
    { kind: "word", text: "One" },
    { kind: "word", text: "MVP" },
    { kind: "word", text: "focuses" },
    { kind: "word", text: "on" },
    { kind: "word", text: "upload," },
    { kind: "word", text: "analysis," },
    { kind: "word", text: "evidence," },
    { kind: "word", text: "and" },
    { kind: "word", text: "review." },
    { kind: "emoji", text: "📡", label: "signal" },
  ],
];

function AnimatedWord({
  index,
  isReady,
  progress,
  text,
  total,
}: {
  index: number;
  isReady: boolean;
  progress: MotionValue<number>;
  text: string;
  total: number;
}) {
  const start = Math.max(0, (index / total) * 0.9 - 0.015);
  const end = Math.min(1, start + 0.11);
  const opacity = useTransform(progress, [start, end], [0.18, 1]);
  const y = useTransform(progress, [start, end], [12, 0]);

  return (
    <motion.span
      className="inline-block whitespace-nowrap pr-[0.22em]"
      style={isReady ? { opacity, y } : { opacity: 0.36 }}
    >
      {text}
    </motion.span>
  );
}

function AnimatedEmoji({
  index,
  isReady,
  label,
  progress,
  text,
  total,
}: {
  index: number;
  isReady: boolean;
  label: string;
  progress: MotionValue<number>;
  text: string;
  total: number;
}) {
  const start = Math.max(0, (index / total) * 0.9 - 0.025);
  const mid = Math.min(1, start + 0.06);
  const end = Math.min(1, start + 0.14);
  const opacity = useTransform(progress, [start, mid], [0.14, 1]);
  const scale = useTransform(progress, [start, mid, end], [0.64, 1.28, 1]);
  const rotate = useTransform(progress, [start, mid, end], [-16, 10, 0]);
  const y = useTransform(progress, [start, mid, end], [14, -8, 0]);

  return (
    <motion.span
      aria-label={label}
      role="img"
      className="mx-[0.12em] inline-flex h-[0.98em] w-[0.98em] origin-center items-center justify-center align-[-0.04em] text-[0.82em]"
      style={isReady ? { opacity, rotate, scale, y } : { opacity: 0.36 }}
    >
      {text}
    </motion.span>
  );
}

export function Manifesto() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isReady, setIsReady] = useState(false);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 92,
    damping: 28,
    mass: 0.45,
  });
  const totalTokens = useMemo(() => manifestoLines.flat().length, []);
  let tokenIndex = 0;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section ref={sectionRef} className="container relative mx-auto max-w-7xl px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="font-display text-[clamp(2rem,4.5vw,4.25rem)] font-extrabold leading-[1.12] tracking-tight">
          {manifestoLines.map((line, lineIndex) => (
            <p key={lineIndex} className={lineIndex === 0 ? "" : "mt-6 sm:mt-8"}>
              {line.map((token) => {
                const currentIndex = tokenIndex++;

                if (token.kind === "emoji") {
                  return (
                    <AnimatedEmoji
                      key={`${token.text}-${currentIndex}`}
                      index={currentIndex}
                      isReady={isReady}
                      label={token.label}
                      progress={progress}
                      text={token.text}
                      total={totalTokens}
                    />
                  );
                }

                return (
                  <AnimatedWord
                    key={`${token.text}-${currentIndex}`}
                    index={currentIndex}
                    isReady={isReady}
                    progress={progress}
                    text={token.text}
                    total={totalTokens}
                  />
                );
              })}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
