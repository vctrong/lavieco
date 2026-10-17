"use client";

import { useEffect, useState } from "react";

/**
 * Whole seconds left until `untilIso` (0 once passed). Only a clock tick lives in
 * state; the remaining time is derived from it on each render.
 */
export function useCountdown(untilIso: string | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!untilIso) return;
    const until = Date.parse(untilIso);
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= until) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [untilIso]);

  return untilIso ? Math.max(0, Math.ceil((Date.parse(untilIso) - now) / 1000)) : 0;
}
