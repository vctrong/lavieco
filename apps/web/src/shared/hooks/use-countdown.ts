"use client";

import { useSyncExternalStore } from "react";

/**
 * One shared second clock. While someone listens it only moves on its 1 s tick, so two
 * reads in one render agree (useSyncExternalStore needs a stable snapshot).
 */
const listeners = new Set<() => void>();
let nowSeconds = 0;
let timer: ReturnType<typeof setInterval> | undefined;

const currentSecond = () => Math.floor(Date.now() / 1000);

function subscribeClock(listener: () => void) {
  if (listeners.size === 0) {
    nowSeconds = currentSecond();
    timer = setInterval(() => {
      nowSeconds = currentSecond();
      listeners.forEach((notify) => notify());
    }, 1000);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) clearInterval(timer);
  };
}

const noSubscription = () => () => {};
const readClock = () => (listeners.size > 0 ? nowSeconds : currentSecond());
// The server and the first (hydrating) render do not know "now": a clock read there
// differs from the server's HTML and React throws a hydration mismatch.
const readServerClock = () => null;

/**
 * Whole seconds left until `untilIso`: 0 without a deadline or once passed, `null` while
 * a server-rendered page hydrates (show a placeholder, the real value follows at once).
 */
export function useCountdown(untilIso: string | null): number | null {
  const now = useSyncExternalStore(
    untilIso ? subscribeClock : noSubscription,
    readClock,
    readServerClock,
  );
  if (!untilIso) return 0;
  if (now === null) return null;
  return Math.max(0, Math.ceil(Date.parse(untilIso) / 1000 - now));
}
