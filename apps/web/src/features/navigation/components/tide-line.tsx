"use client";

import { useEffect, useRef } from "react";

import { PearlDot } from "@lavieco/ui";

import { subscribeScroll } from "../hooks/scroll-store";

/** 2px reading-progress line fixed to the top of the viewport (design.md §7.5.1). */
export function TideLine() {
  const fillRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      subscribeScroll(({ progress }) => {
        if (fillRef.current) fillRef.current.style.transform = `scaleX(${progress})`;
        if (dotRef.current) {
          const width = document.documentElement.clientWidth;
          dotRef.current.style.transform = `translateX(${progress * width}px)`;
        }
      }),
    [],
  );

  return (
    <div aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-50 h-[2px] w-full">
      <div
        ref={fillRef}
        className="h-full origin-left scale-x-0 bg-emerald-brand will-change-transform"
      />
      <div
        ref={dotRef}
        className="absolute left-0 top-1/2 -ml-1 -translate-y-1/2 will-change-transform"
      >
        <PearlDot size="sm" tone="canary" />
      </div>
    </div>
  );
}
