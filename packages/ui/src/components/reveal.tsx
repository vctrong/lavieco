"use client";

import type { HTMLAttributes } from "react";

import { useReveal } from "../hooks/use-reveal";
import { cn } from "../lib/cn";

/** Fades and lifts its children in when scrolled into view (700ms). */
export function Reveal({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const { ref, state } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700",
        state === "hidden" && "translate-y-4 opacity-0",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
