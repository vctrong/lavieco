"use client";

import { animate, motion, useMotionValue, useTransform, type MotionValue } from "motion/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";

import type { PublicHandbookPage } from "@lavieco/shared/content";
import { cn } from "@lavieco/ui";

import { FADE_MS, FLIP_MS } from "../../constants/config";
import type { PageSize } from "../../hooks/use-book-layout";
import { pagesOfSpread, spreadCount, spreadIndexOf } from "../../utils/book-math";
import { PageFace } from "./page-face";

export type TurnDirection = "next" | "prev";
export type TurnFn = (direction: TurnDirection) => void;

type Flip = { direction: TurnDirection };

const EASE = [0.3, 0.1, 0.2, 1] as const;

type Position = { current: number; spread: boolean; total: number };

function canTurnFrom({ current, spread, total }: Position, direction: TurnDirection) {
  if (!spread) return direction === "next" ? current < total : current > 1;
  const index = spreadIndexOf(current);
  return direction === "next" ? index < spreadCount(total) - 1 : index > 0;
}

/** First page shown after turning (the left page of a spread when there is one). */
function targetFrom({ current, spread, total }: Position, direction: TurnDirection) {
  if (!spread) return current + (direction === "next" ? 1 : -1);
  const target = pagesOfSpread(spreadIndexOf(current) + (direction === "next" ? 1 : -1), total);
  return target.left ?? target.right ?? current;
}
/** Past this angle a released drag completes the turn. */
const COMMIT_ANGLE = 55;
const TAP_SLOP = 10;
const MAX_ZOOM = 3;

/** Darkness of a leaf and of the page under it, strongest when the leaf stands upright. */
function useShade(angle: MotionValue<number>, max: number) {
  return useTransform(
    angle,
    (value) => Math.sin((Math.min(180, Math.max(0, value)) * Math.PI) / 180) * max,
  );
}

function Leaf({
  angle,
  direction,
  spread,
  front,
  back,
  size,
  renderOverlay,
}: {
  angle: MotionValue<number>;
  direction: TurnDirection;
  spread: boolean;
  front: PublicHandbookPage | null;
  back: PublicHandbookPage | null;
  size: PageSize;
  renderOverlay?: (page: PublicHandbookPage) => ReactNode;
}) {
  // The leaf turns around the spine: left edge for "next" (and for a single page),
  // right edge when a left page turns back in a spread.
  const aroundRight = spread && direction === "prev";
  const rotateY = useTransform(angle, (value) =>
    aroundRight ? value : !spread && direction === "prev" ? -(180 - value) : -value,
  );
  const shade = useShade(angle, 0.32);
  const frontSide = spread ? (aroundRight ? "left" : "right") : "single";
  const backSide = spread ? (aroundRight ? "right" : "left") : "single";
  return (
    <motion.div
      aria-hidden="true"
      className="absolute top-0 z-20 [transform-style:preserve-3d] will-change-transform"
      style={{
        width: size.width,
        height: size.height,
        left: spread ? (aroundRight ? 0 : size.width) : 0,
        transformOrigin: aroundRight ? "right center" : "left center",
        rotateY,
      }}
    >
      <div className="absolute inset-0 [backface-visibility:hidden]">
        <PageFace
          page={front}
          widthPx={size.width}
          side={frontSide}
          eager
          overlay={front && renderOverlay?.(front)}
        />
        <motion.span
          className="pointer-events-none absolute inset-0 bg-charcoal"
          style={{ opacity: shade }}
        />
      </div>
      <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
        <PageFace page={spread ? back : null} widthPx={size.width} side={backSide} eager />
        <motion.span
          className="pointer-events-none absolute inset-0 bg-charcoal"
          style={{ opacity: shade }}
        />
      </div>
    </motion.div>
  );
}

/**
 * The open book (02-doc layout). Turning a page animates only `transform` (rotateY of
 * one leaf) and `opacity` (its shading), so it stays at 60 fps on a mid-range phone.
 * Only the visible spread, the turning leaf and the next pages are mounted; neighbours
 * are kept in a hidden layer so their images are already loaded when they turn.
 * With reduced motion the pages crossfade instead.
 */
export function FlipBook({
  pages,
  spread,
  size,
  current,
  reduced,
  turnRef,
  onTurned,
  onTap,
  onTurnStart,
  renderOverlay,
  zoomEnabled,
}: {
  pages: readonly PublicHandbookPage[];
  spread: boolean;
  size: PageSize;
  current: number;
  reduced: boolean;
  turnRef: RefObject<TurnFn | null>;
  onTurned: (page: number) => void;
  onTap: (zone: "left" | "middle" | "right") => void;
  onTurnStart?: () => void;
  renderOverlay?: (page: PublicHandbookPage) => ReactNode;
  zoomEnabled: boolean;
}) {
  const total = pages.length;
  const pageAt = (n: number | null) => (n && n >= 1 && n <= total ? pages[n - 1]! : null);
  const angle = useMotionValue(0);
  const [flip, setFlip] = useState<Flip | null>(null);
  const busy = useRef(false);
  const surface = useRef<HTMLDivElement>(null);

  // --- where we are, and where a turn leads ---
  const spreadIndex = spreadIndexOf(current);
  const latest = useRef({ current, spread, total, reduced, onTurned, onTurnStart });
  useLayoutEffect(() => {
    latest.current = { current, spread, total, reduced, onTurned, onTurnStart };
  });
  const canTurn = (direction: TurnDirection) => canTurnFrom(latest.current, direction);
  // --- zoom (one page, phones): pinch, double tap, pan ---
  const [zoom, setZoom] = useState({ scale: 1, x: 0, y: 0 });
  const zoomed = zoom.scale > 1.01;
  const zoomedRef = useRef(zoomed);
  useLayoutEffect(() => {
    zoomedRef.current = zoomed;
  });
  // A new page always opens unzoomed.
  const [zoomedPage, setZoomedPage] = useState(current);
  if (zoomedPage !== current) {
    setZoomedPage(current);
    setZoom({ scale: 1, x: 0, y: 0 });
  }

  const finish = useCallback(
    (direction: TurnDirection, commit: boolean) => {
      const remaining = commit ? 180 - angle.get() : angle.get();
      const duration = Math.max(0.12, (FLIP_MS / 1000) * (remaining / 180));
      void animate(angle, commit ? 180 : 0, { duration, ease: EASE }).then(() => {
        if (commit) latest.current.onTurned(targetFrom(latest.current, direction));
        setFlip(null);
        angle.set(0);
        busy.current = false;
      });
    },
    [angle],
  );

  const turn = useCallback<TurnFn>(
    (direction) => {
      if (busy.current || !canTurnFrom(latest.current, direction) || zoomedRef.current) return;
      latest.current.onTurnStart?.();
      if (latest.current.reduced) {
        latest.current.onTurned(targetFrom(latest.current, direction));
        return;
      }
      busy.current = true;
      angle.set(0);
      setFlip({ direction });
      requestAnimationFrame(() => finish(direction, true));
    },
    [angle, finish],
  );

  useEffect(() => {
    turnRef.current = turn;
  }, [turn, turnRef]);

  // --- pointer: drag to turn, tap to toggle controls, pinch/pan when zoomed ---
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    startX: number;
    startY: number;
    moved: boolean;
    turning: TurnDirection | null;
    pinch: { distance: number; scale: number } | null;
    pan: { x: number; y: number; zx: number; zy: number } | null;
    lastTap: number;
  }>({ startX: 0, startY: 0, moved: false, turning: null, pinch: null, pan: null, lastTap: 0 });

  const distance = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  const onPointerDown = (event: ReactPointerEvent) => {
    if ((event.target as HTMLElement).closest("[data-hotspot]")) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    surface.current?.setPointerCapture(event.pointerId);
    const g = gesture.current;
    if (pointers.current.size === 2 && zoomEnabled) {
      g.pinch = { distance: distance(), scale: zoom.scale };
      g.moved = true;
      return;
    }
    g.startX = event.clientX;
    g.startY = event.clientY;
    g.moved = false;
    g.turning = null;
    g.pan = zoomed ? { x: event.clientX, y: event.clientY, zx: zoom.x, zy: zoom.y } : null;
  };

  const onPointerMove = (event: ReactPointerEvent) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const g = gesture.current;
    if (g.pinch) {
      const scale = Math.min(
        MAX_ZOOM,
        Math.max(1, (g.pinch.scale * distance()) / (g.pinch.distance || 1)),
      );
      setZoom((z) => (scale <= 1.01 ? { scale: 1, x: 0, y: 0 } : { ...z, scale }));
      return;
    }
    const dx = event.clientX - g.startX;
    const dy = event.clientY - g.startY;
    if (!g.moved && Math.hypot(dx, dy) > TAP_SLOP) g.moved = true;
    if (g.pan) {
      setZoom((z) => ({ ...z, x: g.pan!.zx + dx, y: g.pan!.zy + dy }));
      return;
    }
    if (busy.current && !g.turning) return;
    if (!g.turning && g.moved && Math.abs(dx) > Math.abs(dy)) {
      const direction: TurnDirection = dx < 0 ? "next" : "prev";
      if (!canTurn(direction) || reduced) return;
      g.turning = direction;
      busy.current = true;
      latest.current.onTurnStart?.();
      setFlip({ direction });
    }
    if (g.turning) {
      const travel = spread ? size.width : size.width * 0.9;
      const progress = (g.turning === "next" ? -dx : dx) / travel;
      angle.set(Math.min(180, Math.max(0, progress * 180)));
    }
  };

  const onPointerUp = (event: ReactPointerEvent) => {
    pointers.current.delete(event.pointerId);
    const g = gesture.current;
    if (g.pinch) {
      if (pointers.current.size < 2) g.pinch = null;
      return;
    }
    if (g.turning) {
      const direction = g.turning;
      g.turning = null;
      finish(direction, angle.get() > COMMIT_ANGLE);
      return;
    }
    if (g.pan) {
      g.pan = null;
      if (g.moved) return;
    }
    if (g.moved) {
      // A swipe without a turn (reduced motion): still turn the page.
      const dx = event.clientX - g.startX;
      if (reduced && Math.abs(dx) > 40) turn(dx < 0 ? "next" : "prev");
      return;
    }
    const now = Date.now();
    if (zoomEnabled && now - g.lastTap < 300) {
      setZoom((z) => (z.scale > 1.01 ? { scale: 1, x: 0, y: 0 } : { scale: 2.5, x: 0, y: 0 }));
      g.lastTap = 0;
      return;
    }
    g.lastTap = now;
    const box = surface.current?.getBoundingClientRect();
    if (!box) return;
    const at = (event.clientX - box.left) / box.width;
    onTap(at < 0.15 ? "left" : at > 0.85 ? "right" : "middle");
  };

  // --- what each layer shows ---
  const here = spread ? pagesOfSpread(spreadIndex, total) : null;
  const next = spread ? pagesOfSpread(spreadIndex + 1, total) : null;
  const prev = spread ? pagesOfSpread(spreadIndex - 1, total) : null;

  let baseLeft: number | null = null;
  let baseRight: number | null = null;
  let front: number | null = null;
  let back: number | null = null;
  let baseSingle = current;
  if (spread && here) {
    baseLeft = here.left;
    baseRight = here.right;
    if (flip?.direction === "next" && next) {
      baseRight = next.right;
      front = here.right;
      back = next.left;
    } else if (flip?.direction === "prev" && prev) {
      baseLeft = prev.left;
      front = here.left;
      back = prev.right;
    }
  } else if (flip) {
    if (flip.direction === "next") {
      baseSingle = current + 1;
      front = current;
    } else {
      front = current - 1;
    }
  }

  const underShade = useShade(angle, 0.22);
  const bookWidth = spread ? size.width * 2 : size.width;
  // Pages already turned make the left block thicker, like a real book.
  const read = total > 1 ? (current - 1) / (total - 1) : 0;
  const edge = (share: number) => Math.round(2 + share * 10);
  const preload = spread
    ? [
        next?.left,
        next?.right,
        prev?.left,
        prev?.right,
        ...Object.values(pagesOfSpread(spreadIndex + 2, total)),
      ]
    : [current + 1, current + 2, current - 1];

  return (
    <div className="relative" style={{ width: bookWidth, height: size.height }}>
      {spread ? (
        <>
          <span
            aria-hidden="true"
            className="absolute inset-y-1 rounded-l-md bg-[repeating-linear-gradient(90deg,var(--color-paper-edge)_0_1px,var(--color-paper)_1px_3px)]"
            style={{ width: edge(read), left: -edge(read), opacity: here?.left ? 1 : 0 }}
          />
          <span
            aria-hidden="true"
            className="absolute inset-y-1 rounded-r-md bg-[repeating-linear-gradient(90deg,var(--color-paper)_0_2px,var(--color-paper-edge)_2px_3px)]"
            style={{ width: edge(1 - read), right: -edge(1 - read), opacity: here?.right ? 1 : 0 }}
          />
        </>
      ) : null}

      <div
        ref={surface}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={cn(
          "relative h-full w-full select-none [perspective:2400px]",
          zoomed ? "touch-none cursor-grab" : "touch-pan-y",
        )}
      >
        <motion.div
          key={reduced ? (spread ? spreadIndex : current) : "book"}
          initial={reduced ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: FADE_MS / 1000 }}
          className="absolute inset-0"
          style={
            zoomed
              ? {
                  transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`,
                  transformOrigin: "center",
                }
              : undefined
          }
        >
          {spread ? (
            <div className="flex h-full shadow-gallery">
              <div className="relative h-full" style={{ width: size.width }}>
                {baseLeft ? (
                  <PageFace
                    page={pageAt(baseLeft)}
                    widthPx={size.width}
                    side="left"
                    eager
                    overlay={!flip && pageAt(baseLeft) ? renderOverlay?.(pageAt(baseLeft)!) : null}
                  />
                ) : null}
                {flip?.direction === "prev" ? (
                  <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-charcoal"
                    style={{ opacity: underShade }}
                  />
                ) : null}
              </div>
              <div className="relative h-full" style={{ width: size.width }}>
                {baseRight ? (
                  <PageFace
                    page={pageAt(baseRight)}
                    widthPx={size.width}
                    side="right"
                    eager
                    overlay={
                      !flip && pageAt(baseRight) ? renderOverlay?.(pageAt(baseRight)!) : null
                    }
                  />
                ) : null}
                {flip?.direction === "next" ? (
                  <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-charcoal"
                    style={{ opacity: underShade }}
                  />
                ) : null}
              </div>
            </div>
          ) : (
            <div className="relative h-full w-full shadow-gallery">
              <PageFace
                page={pageAt(baseSingle)}
                widthPx={zoomed ? size.width * zoom.scale : size.width}
                side="single"
                eager
                overlay={
                  !flip && !zoomed && pageAt(baseSingle)
                    ? renderOverlay?.(pageAt(baseSingle)!)
                    : null
                }
              />
            </div>
          )}
        </motion.div>

        {flip && front !== null ? (
          <Leaf
            angle={angle}
            direction={flip.direction}
            spread={spread}
            front={pageAt(front)}
            back={pageAt(back)}
            size={size}
            renderOverlay={undefined}
          />
        ) : null}
      </div>

      {/* Neighbours, loaded ahead so they never pop in while turning. */}
      <div
        aria-hidden="true"
        className="pointer-events-none invisible absolute left-0 top-0 -z-10 overflow-hidden"
        style={{ width: size.width, height: size.height }}
      >
        {preload
          .filter((n): n is number => typeof n === "number" && n >= 1 && n <= total)
          .map((n) => (
            <div key={n} className="absolute inset-0">
              <PageFace page={pageAt(n)} widthPx={size.width} side="single" eager />
            </div>
          ))}
      </div>
    </div>
  );
}
