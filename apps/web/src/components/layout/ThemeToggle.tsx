"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

function readTheme(): Theme {
  if (typeof window === "undefined") return "light";

  const savedTheme = localStorage.getItem("theme") as Theme | null;
  if (savedTheme) return savedTheme;

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribeThemeChange(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const notify = () => callback();

  window.addEventListener("storage", notify);
  window.addEventListener("sightline-theme-change", notify);
  media.addEventListener("change", notify);

  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener("sightline-theme-change", notify);
    media.removeEventListener("change", notify);
  };
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribeThemeChange, readTheme, () => "light");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    window.dispatchEvent(new Event("sightline-theme-change"));
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle bg-surface text-foreground shadow-sm transition-all hover:bg-muted hover:shadow-[0_0_15px_hsl(184_85%_55%/0.15)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
    </button>
  );
}
