import { cn } from "../lib/cn";

const SIZES = {
  xs: "size-1",
  sm: "size-1.5",
  md: "size-2",
  lg: "size-2.5",
  xl: "size-3",
} as const;

const TONES = {
  canary: "bg-canary shadow-glow-canary",
  "canary-flat": "bg-canary",
  emerald: "bg-emerald-brand shadow-glow-emerald",
  "emerald-flat": "bg-emerald-brand",
} as const;

const MOTIONS = { none: "", pulse: "animate-pulse", ping: "animate-ping" } as const;

type PearlDotProps = {
  size?: keyof typeof SIZES;
  tone?: keyof typeof TONES;
  motion?: keyof typeof MOTIONS;
  className?: string;
};

/** The signature "pearl": a small glowing dot. Decorative, so hidden from assistive tech. */
export function PearlDot({
  size = "sm",
  tone = "canary-flat",
  motion = "none",
  className,
}: PearlDotProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block shrink-0 rounded-full",
        SIZES[size],
        TONES[tone],
        MOTIONS[motion],
        className,
      )}
    />
  );
}
