"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keeps Tab / Shift+Tab inside `containerRef` while `active`. */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    const container = containerRef.current;
    if (!active || !container) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (item) => item.offsetParent !== null || item === document.activeElement,
      );
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      const current = document.activeElement;
      if (event.shiftKey && (current === first || !container.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !container.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [containerRef, active]);
}
