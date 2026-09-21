"use client";

import { useLayoutEffect, useRef } from "react";

import { ZOOM } from "../constants/config";
import type { ZoomRect, ZoomSource } from "../types";

type Options = {
  getSource: () => ZoomSource | null;
  /** Person size in the sticker relative to the borderless file. */
  stickerScale: number;
  reduced: boolean;
};

const FULL_CLIP = "inset(0px 0px 0px 0px round 0px 0px 0px 0px)";

const centre = (r: ZoomRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

const rectOf = (element: Element): ZoomRect => {
  const box = element.getBoundingClientRect();
  return { left: box.left, top: box.top, width: box.width, height: box.height };
};

const inViewport = (r: ZoomRect) =>
  r.left < window.innerWidth &&
  r.left + r.width > 0 &&
  r.top < window.innerHeight &&
  r.top + r.height > 0;

/** Uniform translate + scale that puts a box of `end` on top of `start` (never distorts). */
function transformOnto(start: ZoomRect, end: ZoomRect, startHeight: number) {
  const from = centre(start);
  const to = centre(end);
  const scale = startHeight / end.height;
  return `translate(${from.x - to.x}px, ${from.y - to.y}px) scale(${scale})`;
}

/** Clip and offset that make the backdrop look exactly like the card's arch. */
function archLook(arch: ZoomRect, end: ZoomRect) {
  const from = centre(arch);
  const to = centre(end);
  const insetX = Math.max(0, (end.width - arch.width) / 2);
  const insetY = Math.max(0, (end.height - arch.height) / 2);
  const radius = arch.width / 2;
  return {
    transform: `translate(${from.x - to.x}px, ${from.y - to.y}px)`,
    clipPath: `inset(${insetY}px ${insetX}px ${insetY}px ${insetX}px round ${radius}px ${radius}px 0px 0px)`,
  };
}

/**
 * The zoom of a profile: the person flies (FLIP) from the card to the profile and back,
 * the backdrop opens out of the card's arch, and the borderless image cross-fades to the
 * outlined one near the end of the flight. Only transform, opacity and clip-path animate.
 *
 * Every closing animation starts from the values on screen right now (computed style), so
 * closing while the opening is still running, or clicking fast, just reverses smoothly.
 */
export function useZoomReveal({ getSource, stickerScale, reduced }: Options) {
  /** Box the person is drawn in (sticker frame); it is the element that flies. */
  const flyerRef = useRef<HTMLDivElement>(null);
  /** Borderless image (start of the flight), stacked over the sticker. */
  const nobgRef = useRef<HTMLImageElement>(null);
  /** White-outlined image (end of the flight). */
  const stickerRef = useRef<HTMLImageElement>(null);
  /** The person's backdrop, which opens out of the card's arch. */
  const backdropRef = useRef<HTMLDivElement>(null);

  // Open: runs before the first paint, so the profile never shows at its final place first.
  useLayoutEffect(() => {
    const flyer = flyerRef.current;
    const nobg = nobgRef.current;
    const sticker = stickerRef.current;
    const backdrop = backdropRef.current;
    const source = getSource();
    if (reduced || !flyer || !nobg || !sticker || !backdrop || !source) return;

    const flyerEnd = rectOf(flyer);
    const backdropEnd = rectOf(backdrop);
    const timing = { duration: ZOOM.openMs, easing: ZOOM.easing, fill: "both" } as const;
    const linear = { duration: ZOOM.openMs, easing: "linear", fill: "both" } as const;

    flyer.style.willChange = "transform";
    backdrop.style.willChange = "transform, clip-path";

    const animations = [
      flyer.animate(
        [
          {
            transform: transformOnto(source.figure, flyerEnd, source.figure.height / stickerScale),
          },
          { transform: "none" },
        ],
        timing,
      ),
      backdrop.animate(
        [{ ...archLook(source.arch, backdropEnd) }, { transform: "none", clipPath: FULL_CLIP }],
        timing,
      ),
      backdrop.animate(
        [{ opacity: 0 }, { opacity: 1, offset: ZOOM.backdropFadeAt }, { opacity: 1 }],
        linear,
      ),
      nobg.animate(
        [{ opacity: 1 }, { opacity: 1, offset: ZOOM.crossfadeAt }, { opacity: 0 }],
        linear,
      ),
      sticker.animate(
        [{ opacity: 0 }, { opacity: 0, offset: ZOOM.crossfadeAt }, { opacity: 1 }],
        linear,
      ),
    ];

    // At the end the natural layout is the final state, so release the animations.
    void Promise.all(animations.map((animation) => animation.finished))
      .then(() => {
        animations.forEach((animation) => animation.cancel());
        flyer.style.willChange = "";
        backdrop.style.willChange = "";
      })
      .catch(() => undefined);

    return () => {
      animations.forEach((animation) => animation.cancel());
      flyer.style.willChange = "";
      backdrop.style.willChange = "";
    };
  }, [getSource, stickerScale, reduced]);

  /** Flies the person back to its card (or fades if the card is off screen). Resolves when done. */
  const close = async (): Promise<void> => {
    const flyer = flyerRef.current;
    const nobg = nobgRef.current;
    const sticker = stickerRef.current;
    const backdrop = backdropRef.current;
    if (reduced || !flyer || !nobg || !sticker || !backdrop) {
      await new Promise((resolve) => window.setTimeout(resolve, ZOOM.reducedMs));
      return;
    }

    // What is on screen right now (mid-flight if the opening has not finished).
    const now = {
      flyer: getComputedStyle(flyer).transform,
      backdropTransform: getComputedStyle(backdrop).transform,
      backdropClip: getComputedStyle(backdrop).clipPath,
      backdropOpacity: getComputedStyle(backdrop).opacity,
      nobg: getComputedStyle(nobg).opacity,
      sticker: getComputedStyle(sticker).opacity,
    };
    for (const element of [flyer, nobg, sticker, backdrop]) {
      element.getAnimations().forEach((animation) => animation.cancel());
      element.style.willChange = "";
    }

    const source = getSource();
    const flyerEnd = rectOf(flyer);
    const backdropEnd = rectOf(backdrop);
    const timing = {
      duration: ZOOM.closeMs,
      delay: ZOOM.closeDelayMs,
      easing: ZOOM.easing,
      fill: "both",
    } as const;
    const linear = { ...timing, easing: "linear" } as const;
    const fromClip = now.backdropClip === "none" ? FULL_CLIP : now.backdropClip;

    const animations: Animation[] = [];
    flyer.style.willChange = "transform";

    if (source && inViewport(source.figure)) {
      animations.push(
        flyer.animate(
          [
            { transform: now.flyer },
            {
              transform: transformOnto(
                source.figure,
                flyerEnd,
                source.figure.height / stickerScale,
              ),
            },
          ],
          timing,
        ),
        backdrop.animate(
          [
            { transform: now.backdropTransform, clipPath: fromClip },
            { ...archLook(source.arch, backdropEnd) },
          ],
          timing,
        ),
        backdrop.animate(
          [
            { opacity: now.backdropOpacity },
            { opacity: now.backdropOpacity, offset: 1 - ZOOM.backdropFadeAt },
            { opacity: 0 },
          ],
          linear,
        ),
        // The outline swaps back to the borderless image in the first 40% of the flight.
        sticker.animate(
          [{ opacity: now.sticker }, { opacity: 0, offset: 1 - ZOOM.crossfadeAt }, { opacity: 0 }],
          linear,
        ),
        nobg.animate(
          [{ opacity: now.nobg }, { opacity: 1, offset: 1 - ZOOM.crossfadeAt }, { opacity: 1 }],
          linear,
        ),
      );
    } else {
      // The card has scrolled out of view: nothing to land on, so fade instead of flying.
      const fade = { duration: 250, easing: "linear", fill: "both" } as const;
      animations.push(
        flyer.animate([{ opacity: 1 }, { opacity: 0 }], fade),
        backdrop.animate([{ opacity: now.backdropOpacity }, { opacity: 0 }], fade),
      );
    }

    await Promise.all(animations.map((animation) => animation.finished)).catch(() => undefined);
    flyer.style.willChange = "";
  };

  return { flyerRef, nobgRef, stickerRef, backdropRef, close };
}
