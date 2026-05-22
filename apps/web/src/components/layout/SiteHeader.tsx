"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { GradientPill } from "@/components/motion/GradientPill";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Workflows", to: "/#workflows" },
  { label: "Architecture", to: "/#architecture" },
  { label: "Docs", to: "/dashboard/docs" },
  { label: "FAQ", to: "/#faq" },
];

function SightlineMark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Sightline home"
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-border-subtle bg-surface shadow-card overflow-hidden transition-all duration-300",
        "h-[52px] w-[52px]",
        className,
      )}
    >
      <ShieldCheck className="h-7 w-7 text-brand-2" />
    </Link>
  );
}

type HeaderMetrics = {
  container: number;
  logo: number;
  nav: number;
  cta: number;
};

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [hideNav, setHideNav] = useState(false);
  const [open, setOpen] = useState(false);
  const [metrics, setMetrics] = useState<HeaderMetrics>({
    container: 0,
    logo: 0,
    nav: 0,
    cta: 0,
  });
  const desktopContainerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const lastScrollYRef = useRef(0);
  const scrollFrameRef = useRef<number | null>(null);
  const pathname = usePathname();

  useLayoutEffect(() => {
    const measure = () => {
      setMetrics({
        container: desktopContainerRef.current?.getBoundingClientRect().width ?? 0,
        logo: logoRef.current?.getBoundingClientRect().width ?? 0,
        nav: navRef.current?.getBoundingClientRect().width ?? 0,
        cta: ctaRef.current?.getBoundingClientRect().width ?? 0,
      });
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    [
      desktopContainerRef.current,
      logoRef.current,
      navRef.current,
      ctaRef.current,
    ].forEach((element) => {
      if (element) resizeObserver.observe(element);
    });
    window.addEventListener("resize", measure);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    const updateHeaderForScroll = () => {
      scrollFrameRef.current = null;
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollYRef.current;

      if (currentScrollY > 100) {
        if (Math.abs(scrollDelta) > 6) {
          setHideNav(scrollDelta > 0);
        }
      } else {
        setHideNav(false);
      }

      setScrolled(currentScrollY > 12);
      lastScrollYRef.current = currentScrollY;
    };

    const onScroll = () => {
      if (scrollFrameRef.current !== null) return;
      scrollFrameRef.current = window.requestAnimationFrame(updateHeaderForScroll);
    };

    updateHeaderForScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const edgeGap = 0;
  const normalGap = 32;
  const desktopContentWidth = metrics.container > 0 ? Math.min(metrics.container, 1152) : 0;
  const desktopContentLeft =
    metrics.container > 0 ? (metrics.container - desktopContentWidth) / 2 : 0;
  const normalLogoLeft = Math.max(
    edgeGap,
    desktopContentLeft + (desktopContentWidth - metrics.nav) / 2 - normalGap - metrics.logo,
  );
  const normalCtaLeft = Math.min(
    Math.max(edgeGap, metrics.container - metrics.cta),
    desktopContentLeft + (desktopContentWidth + metrics.nav) / 2 + normalGap,
  );
  const hiddenCtaLeft = Math.max(edgeGap, metrics.container - metrics.cta);
  const logoLeft = metrics.container ? `${normalLogoLeft}px` : "calc(50% - 250px)";
  const ctaLeft = metrics.container ? `${normalCtaLeft}px` : "calc(50% + 190px)";
  const logoOffset = metrics.container && hideNav ? edgeGap - normalLogoLeft : 0;
  const ctaOffset = metrics.container && hideNav ? hiddenCtaLeft - normalCtaLeft : 0;

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:pt-5">
      <div
        className="relative z-20 mx-auto hidden h-[58px] w-full max-w-[calc(100vw-2rem)] md:block"
        ref={desktopContainerRef}
      >
        <div
          ref={logoRef}
          className="absolute top-1/2 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
          style={{ left: logoLeft, transform: `translate3d(${logoOffset}px, -50%, 0)` }}
        >
          <SightlineMark />
        </div>

        <nav
          ref={navRef}
          className={cn(
            "absolute left-1/2 top-1/2 flex items-center gap-1 rounded-full border border-border-subtle bg-surface/90 px-3 py-2.5 text-sm font-medium shadow-card backdrop-blur-md",
            scrolled && "shadow-pill",
            "transition-[opacity,transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            hideNav
              ? "pointer-events-none -translate-x-1/2 -translate-y-[180%] opacity-0"
              : "-translate-x-1/2 -translate-y-1/2 opacity-100",
          )}
        >
          {navItems.map((item) => (
            <Link
              key={item.to}
              href={item.to}
              className={cn(
                "rounded-full px-4 py-1.5 text-foreground/70 transition-colors hover:bg-muted hover:text-foreground",
                pathname === item.to && item.to !== "/" && "bg-muted text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div
          ref={ctaRef}
          className="absolute top-1/2 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
          style={{ left: ctaLeft, transform: `translate3d(${ctaOffset}px, -50%, 0)` }}
        >
          <Link href="/register" className="inline-flex">
            <GradientPill
              className={cn(
                "circulating-border h-[46px] px-5 py-2",
                "transition-all duration-500 ease-in-out",
              )}
            >
              Open app
            </GradientPill>
          </Link>
        </div>
      </div>

      <div className="relative z-30 mx-auto flex h-[52px] w-full items-center justify-between md:hidden">
        <SightlineMark className="h-12 w-12" />
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className={cn(
            "relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-border-subtle bg-surface/85 shadow-card backdrop-blur-md transition-[border-color,box-shadow,transform] duration-300",
            open && "border-brand-1/40 shadow-pill",
          )}
        >
          <span
            className={cn(
              "absolute h-0.5 w-4 rounded-full bg-foreground transition-transform duration-300",
              open ? "translate-y-0 rotate-45" : "-translate-y-1.5",
            )}
          />
          <span
            className={cn(
              "absolute h-0.5 w-4 rounded-full bg-foreground transition-opacity duration-200",
              open ? "opacity-0" : "opacity-100",
            )}
          />
          <span
            className={cn(
              "absolute h-0.5 w-4 rounded-full bg-foreground transition-transform duration-300",
              open ? "translate-y-0 -rotate-45" : "translate-y-1.5",
            )}
          />
        </button>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-20 md:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 h-full w-full bg-background/72 backdrop-blur-xl transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        <nav
          aria-label="Mobile navigation"
          className={cn(
            "relative z-10 flex min-h-dvh flex-col items-center justify-center gap-6 px-6 pb-8 text-center transition-[opacity,transform] duration-300",
            open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
          )}
        >
          {navItems.map((item) => (
            <Link
              key={item.to}
              href={item.to}
              onClick={() => setOpen(false)}
              className="text-3xl font-semibold tracking-normal text-foreground transition-colors hover:text-brand-2"
            >
              {item.label}
            </Link>
          ))}
          <Link href="/register" className="mt-3 inline-flex" onClick={() => setOpen(false)}>
            <GradientPill className="circulating-border px-7 py-3">Open app</GradientPill>
          </Link>
        </nav>
      </div>
    </header>
  );
}
