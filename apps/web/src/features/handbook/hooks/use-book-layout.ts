"use client";

import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

/**
 * Two pages side by side on a wide landscape screen, one page otherwise (phones,
 * portrait tablets). Follows rotation live; the server renders one page.
 */
const SPREAD_QUERY = "(min-width: 900px) and (min-aspect-ratio: 1/1)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(SPREAD_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function useSpreadLayout(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(SPREAD_QUERY).matches,
    () => false,
  );
}

export type PageSize = { width: number; height: number };

/**
 * Largest page that fits the stage: the whole spread (or page) plus `reserveX` pixels
 * of side controls must be visible, never cropped (1440×900: two pages, tabs, buttons).
 */
export function usePageSize(
  stage: RefObject<HTMLElement | null>,
  pagesAcross: number,
  ratio: number,
  reserveX: number,
): PageSize | null {
  const [size, setSize] = useState<PageSize | null>(null);
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      const byHeight = height;
      const byWidth = ((width - reserveX) / pagesAcross) * ratio;
      const pageHeight = Math.max(160, Math.floor(Math.min(byHeight, byWidth)));
      setSize({ width: Math.floor(pageHeight / ratio), height: pageHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [stage, pagesAcross, ratio, reserveX]);
  return size;
}
