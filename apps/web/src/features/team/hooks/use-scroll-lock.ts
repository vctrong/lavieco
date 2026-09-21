"use client";

import { useEffect } from "react";

/**
 * Locks page scroll while `active` without the page shifting sideways. With
 * `scrollbar-gutter: stable` the scrollbar's space stays reserved (fixed elements
 * included); browsers without it get padding that matches the scrollbar width.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const previousGutter = root.style.scrollbarGutter;
    const previousPadding = root.style.paddingRight;
    const scrollbarWidth = window.innerWidth - root.clientWidth;

    if (CSS.supports("scrollbar-gutter", "stable")) {
      root.style.scrollbarGutter = "stable";
    } else if (scrollbarWidth > 0) {
      root.style.paddingRight = `${scrollbarWidth}px`;
    }
    root.style.overflow = "hidden";

    return () => {
      root.style.overflow = previousOverflow;
      root.style.scrollbarGutter = previousGutter;
      root.style.paddingRight = previousPadding;
    };
  }, [active]);
}
