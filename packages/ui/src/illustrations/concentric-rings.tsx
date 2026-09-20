import { cn } from "../lib/cn";

type ConcentricRingsProps = {
  radii: readonly number[];
  /** Vertical center of the rings, e.g. "100%" (rising from the bottom) or "50%". */
  cy?: string;
  className?: string;
};

/** Ripple rings drawn behind arch content. Decorative. */
export function ConcentricRings({ radii, cy = "100%", className }: ConcentricRingsProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      {radii.map((r) => (
        <circle key={r} cx="50%" cy={cy} r={r} />
      ))}
    </svg>
  );
}
