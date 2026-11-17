import { cn } from "../lib/cn";

/**
 * Placeholder block shown while content loads. Same footprint as what replaces it, so
 * nothing jumps; the pulse stops under `prefers-reduced-motion`. Hidden from screen
 * readers: the region that loads announces itself (`aria-busy`).
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-pedestal bg-deep-blue/[0.07] motion-safe:animate-pulse", className)}
    />
  );
}
