import { cn } from "@lavieco/ui";

const SIZES = {
  md: { halo: "size-16", mid: "size-9", core: "size-2.5" },
  lg: { halo: "size-24", mid: "size-14", core: "size-3.5" },
} as const;

type GlowingPearlProps = {
  size?: keyof typeof SIZES;
  /** `soft` dims the halo (used when the sea is rough) while the core stays lit. */
  intensity?: "full" | "soft";
  className?: string;
};

/** A canary pearl with a breathing halo. Decorative. */
export function GlowingPearl({ size = "lg", intensity = "full", className }: GlowingPearlProps) {
  const s = SIZES[size];
  return (
    <span
      aria-hidden="true"
      className={cn("relative flex items-center justify-center", s.halo, className)}
    >
      <span
        className={cn(
          "absolute rounded-full bg-canary/40 blur-md motion-safe:animate-pearl-breathe",
          s.halo,
          intensity === "soft" && "opacity-60",
        )}
      />
      <span className={cn("absolute rounded-full bg-canary/60 blur-xs", s.mid)} />
      <span className={cn("relative rounded-full bg-canary shadow-glow-canary", s.core)} />
    </span>
  );
}
