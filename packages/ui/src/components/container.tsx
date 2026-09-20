import type { HTMLAttributes } from "react";

import { cn } from "../lib/cn";

/**
 * Horizontal page container: centered, capped at max-w-7xl, with the standard
 * gutters (px-6 / md:px-16 / lg:px-24, design.md §4.2). Backgrounds stay
 * full-bleed outside it.
 */
export function Container({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-6 md:px-16 lg:px-24", className)} {...rest} />
  );
}
