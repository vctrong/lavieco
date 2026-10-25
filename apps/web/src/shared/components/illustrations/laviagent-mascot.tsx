import { cn } from "@lavieco/ui";

type LaviAgentMascotProps = {
  className?: string;
  /** Accessible name; without it the mascot is decorative. */
  label?: string;
  /** "solid": Emerald disc (avatar). "line": no disc, for light chips and pills. */
  variant?: "solid" | "line";
};

/**
 * LaviAgent's mascot: a sprout with a Canary spark. Shared by the navbar, the floating
 * button and the LaviAgent screens, so it lives in `shared/` (features do not import
 * each other, F2).
 */
export function LaviAgentMascot({ className, label, variant = "solid" }: LaviAgentMascotProps) {
  const solid = variant === "solid";
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("shrink-0", className)}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {solid ? <circle cx="24" cy="25" r="22" className="fill-emerald-brand" /> : null}
      <path
        d="M16.5 37.5 Q24 34 31.5 37.5"
        fill="none"
        strokeWidth="2.2"
        strokeLinecap="round"
        className={solid ? "stroke-mint-mist/70" : "stroke-emerald-ink/50"}
      />
      <path
        d="M24 36 V23"
        fill="none"
        strokeWidth="2.6"
        strokeLinecap="round"
        className={solid ? "stroke-soft-white" : "stroke-emerald-ink"}
      />
      <path
        d="M24 28 C16.5 28 12.5 22.5 13.5 16 C20 16 24.5 20.5 24 28 Z"
        className={solid ? "fill-soft-white" : "fill-emerald-brand"}
      />
      <path
        d="M24 24 C24.5 16.5 29.5 12 36 12.5 C36.5 19 31.5 24 24 24 Z"
        className={solid ? "fill-mint-mist" : "fill-emerald-ink"}
      />
      <path
        d="M39 3.5 L40.6 8.4 L45.5 10 L40.6 11.6 L39 16.5 L37.4 11.6 L32.5 10 L37.4 8.4 Z"
        className="fill-canary stroke-deep-blue/15"
        strokeWidth="0.6"
      />
    </svg>
  );
}
