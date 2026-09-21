import { cn } from "../lib/cn";

type WaveLinesProps = {
  /** Vertical offsets of each wave line. */
  offsets: readonly number[];
  className?: string;
};

/** Repeating soft waves ("tide") drawn behind content. Decorative. */
export function WaveLines({ offsets, className }: WaveLinesProps) {
  const d = offsets.map((y) => `M0 ${y} Q 60 ${y + 30} 120 ${y} T 240 ${y}`).join(" ");
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <path d={d} />
    </svg>
  );
}
