"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@lavieco/ui";

/**
 * Icon-only control of the reader bars: 44 px target, the label as accessible name and
 * as a small tooltip on hover or keyboard focus (02-doc: one-line bar, icons only).
 */
export function IconButton({
  label,
  children,
  active = false,
  tone = "light",
  className,
  ...rest
}: ComponentPropsWithoutRef<"button"> & {
  label: string;
  children: ReactNode;
  active?: boolean;
  tone?: "light" | "dark";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "group/icon relative grid size-11 shrink-0 place-items-center rounded-full transition-colors motion-reduce:transition-none",
        tone === "light"
          ? active
            ? "bg-mint-mist text-emerald-ink"
            : "text-deep-blue hover:bg-mint-mist"
          : "text-soft-white hover:bg-soft-white/10",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-ink disabled:opacity-40",
        className,
      )}
      {...rest}
    >
      {children}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-charcoal px-2 py-1 text-meta text-soft-white group-hover/icon:block group-focus-visible/icon:block"
      >
        {label}
      </span>
    </button>
  );
}
