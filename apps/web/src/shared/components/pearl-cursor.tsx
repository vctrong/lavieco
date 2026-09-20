"use client";

import { useEffect, useRef, useState } from "react";

import { SITE_TEXT } from "../constants/text";

const ENABLED_QUERY =
  "(min-width: 768px) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
const VIEW_TARGET_SELECTOR = "[data-cursor='view']";

/**
 * Canary pearl that follows the pointer and grows into a "view" bubble over
 * elements marked `data-cursor="view"`. Desktop, fine pointer, and motion
 * allowed only. The system cursor stays visible.
 */
export function PearlCursor() {
  const [enabled, setEnabled] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = window.matchMedia(ENABLED_QUERY);
    const sync = () => setEnabled(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!enabled || !cursor) return;

    let frame = 0;
    let x = 0;
    let y = 0;

    const paint = () => {
      frame = 0;
      cursor.style.transform = `translate(${x}px, ${y}px)`;
    };
    const handleMove = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      cursor.dataset.ready = "true";
      if (!frame) frame = window.requestAnimationFrame(paint);
    };
    const handleOver = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      cursor.dataset.expanded = String(Boolean(target?.closest(VIEW_TARGET_SELECTOR)));
    };
    const handleLeave = () => {
      cursor.dataset.ready = "false";
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    document.addEventListener("pointerover", handleOver, { passive: true });
    document.documentElement.addEventListener("pointerleave", handleLeave);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerover", handleOver);
      document.documentElement.removeEventListener("pointerleave", handleLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      data-ready="false"
      data-expanded="false"
      className="group pointer-events-none fixed left-0 top-0 z-[9999] flex size-3 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full bg-canary text-[10px] font-medium uppercase tracking-wider text-deep-blue opacity-0 shadow-cursor-halo transition-[width,height,opacity,transform] duration-200 data-[expanded=true]:size-16 data-[ready=true]:opacity-100"
    >
      <span className="opacity-0 transition-opacity duration-200 group-data-[expanded=true]:opacity-100">
        {SITE_TEXT.vi.pearlCursorLabel}
      </span>
    </div>
  );
}
