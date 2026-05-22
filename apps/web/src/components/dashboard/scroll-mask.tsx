"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type ScrollMaskProps = {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
};

export function ScrollMask({ children, className, viewportClassName }: ScrollMaskProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });

  const updateEdges = useCallback(() => {
    const node = viewportRef.current;
    if (!node) {
      return;
    }
    const maxScroll = Math.max(0, node.scrollHeight - node.clientHeight);
    setEdges({
      top: node.scrollTop > 2,
      bottom: node.scrollTop < maxScroll - 2,
    });
  }, []);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) {
      return;
    }

    updateEdges();
    node.addEventListener("scroll", updateEdges, { passive: true });
    const observer = new ResizeObserver(updateEdges);
    observer.observe(node);
    if (node.firstElementChild) {
      observer.observe(node.firstElementChild);
    }

    return () => {
      node.removeEventListener("scroll", updateEdges);
      observer.disconnect();
    };
  }, [updateEdges]);

  return (
    <div
      className={cn("scroll-mask", className)}
      data-scroll-top={edges.top ? "true" : "false"}
      data-scroll-bottom={edges.bottom ? "true" : "false"}
    >
      <div ref={viewportRef} className={cn("scroll-mask__viewport sightline-scrollbar", viewportClassName)}>
        {children}
      </div>
    </div>
  );
}
