"use client";

import { useEffect, useRef, useState } from "react";

export type RevealState = "visible" | "hidden" | "revealed";

/**
 * Scroll reveal via IntersectionObserver.
 *
 * Content is visible by default (no JS, reduced motion, or already in the
 * viewport on mount). Only elements below the fold are hidden, then revealed
 * once when they enter the viewport.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [state, setState] = useState<RevealState>("visible");

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (element.getBoundingClientRect().top < window.innerHeight) return;

    setState("hidden");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState("revealed");
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, state };
}
