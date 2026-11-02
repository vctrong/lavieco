"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

import { HERO_FAN } from "../constants/config";

const VAR_X = "--hero-px";
const VAR_Y = "--hero-py";

/**
 * The hero cluster's only client code: it sets `data-fanned` and two parallax variables on
 * the `group/fan` wrapper, and all the motion is CSS on the server-rendered children. The
 * listeners sit on this static wrapper, not on the arches, so a moving arch can never slide
 * out from under the pointer and make the fan flicker.
 */
export function HeroArchStage({ className, children }: { className: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [fanned, setFanned] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const parallaxFrame = useRef(0);

  // No hover on touch screens: open once when the cluster comes into view.
  useEffect(() => {
    const stage = ref.current;
    if (!stage || !window.matchMedia("(hover: none)").matches) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        setFanned(true);
        holdTimer.current = setTimeout(() => setFanned(false), HERO_FAN.touchHoldMs);
      },
      { threshold: 0.5 },
    );
    observer.observe(stage);
    return () => {
      observer.disconnect();
      clearTimeout(holdTimer.current);
    };
  }, []);

  useEffect(() => () => cancelAnimationFrame(parallaxFrame.current), []);

  const moveParallax = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const stage = event.currentTarget;
    const { clientX, clientY } = event;
    cancelAnimationFrame(parallaxFrame.current);
    parallaxFrame.current = requestAnimationFrame(() => {
      const box = stage.getBoundingClientRect();
      const x = ((clientX - box.left) / box.width - 0.5) * 2 * HERO_FAN.parallaxMaxPx;
      const y = ((clientY - box.top) / box.height - 0.5) * 2 * HERO_FAN.parallaxMaxPx;
      stage.style.setProperty(VAR_X, `${x.toFixed(2)}px`);
      stage.style.setProperty(VAR_Y, `${y.toFixed(2)}px`);
    });
  };

  const resetParallax = (stage: HTMLDivElement) => {
    cancelAnimationFrame(parallaxFrame.current);
    stage.style.removeProperty(VAR_X);
    stage.style.removeProperty(VAR_Y);
  };

  return (
    <div
      ref={ref}
      data-fanned={fanned}
      className={className}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") setFanned(true);
      }}
      onPointerMove={moveParallax}
      onPointerLeave={(event) => {
        if (event.pointerType === "touch") return;
        setFanned(false);
        resetParallax(event.currentTarget);
      }}
      onPointerUp={(event) => {
        // A scroll gesture ends in pointercancel, so this only fires on a real tap.
        if (event.pointerType !== "touch") return;
        clearTimeout(holdTimer.current);
        setFanned((open) => !open);
      }}
    >
      {children}
    </div>
  );
}
