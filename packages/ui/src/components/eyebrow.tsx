import type { ReactNode } from "react";

import { cn } from "../lib/cn";

const TONES = {
  emerald: "text-emerald-brand font-semibold",
  deep: "text-deep-blue/70 font-medium",
  canary: "text-canary font-medium",
  mint: "text-mint-mist font-semibold",
} as const;

type EyebrowProps = {
  children: ReactNode;
  tone?: keyof typeof TONES;
  className?: string;
};

/** Small uppercase museum label ("Nº 001", section kickers). */
export function Eyebrow({ children, tone = "emerald", className }: EyebrowProps) {
  return (
    <span className={cn("block text-xs uppercase tracking-museum", TONES[tone], className)}>
      {children}
    </span>
  );
}
