"use client";

import { motion } from "motion/react";

import { cn } from "@lavieco/ui";

type NoteArrowProps = {
  side: "left" | "right";
  /** Seconds before the arrow starts drawing. */
  delay: number;
  duration: number;
  animated: boolean;
  className?: string;
};

/** Dashed curved arrow that draws itself (pathLength). Decorative. */
export function NoteArrow({ side, delay, duration, animated, className }: NoteArrowProps) {
  const draw = animated
    ? {
        initial: { pathLength: 0, opacity: 0 },
        animate: { pathLength: 1, opacity: 1 },
        transition: { delay, duration, ease: "easeOut" as const },
      }
    : {};

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 80 40"
      fill="none"
      className={cn("h-10 w-20 text-mint-mist", side === "right" && "-scale-x-100", className)}
    >
      <motion.path
        d="M4 8C18 20 42 26 68 12"
        stroke="currentColor"
        strokeDasharray="3 3"
        strokeLinecap="round"
        strokeWidth="1.8"
        {...draw}
      />
      <motion.path
        d="M62 6L72 11L64 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        {...draw}
      />
    </svg>
  );
}
