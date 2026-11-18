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
import { spreadAt, spreadCount, type Face, type Slot } from "../../utils/book-faces";
import { PageFace } from "./page-face";

export type TurnDirection = "next" | "prev";
export type TurnFn = (direction: TurnDirection) => void;

type Flip = { direction: TurnDirection; hard: boolean };

const EASE = [0.3, 0.1, 0.2, 1] as const;
/** A cover is board, not paper: it turns a little slower and casts a darker shadow. */
const HARD_COVER_SLOWDOWN = 1.4;
/** Past this angle a released drag completes the turn. */
const COMMIT_ANGLE = 55;
const TAP_SLOP = 10;
const MAX_ZOOM = 3;

const isCover = (slot: Slot) => Boolean(slot && slot.type === "cover");
const pageOf = (slot: Slot): PublicHandbookPage | null =>
  slot && slot.type === "page" ? slot.page : null;

/** Whether the leaf about to turn is a cover (it then turns like board). */
function coverTurns(
  state: { index: number; spread: boolean; slots: readonly Slot[]; faces: readonly Face[] },
  direction: TurnDirection,
): boolean {
  const { index: at, spread: two, slots, faces } = state;
  if (!two) return isCover(direction === "next" ? faces[at] : faces[at - 1]);
  const here = spreadAt(slots, at);
  const there = spreadAt(slots, at + (direction === "next" ? 1 : -1));
  return direction === "next"
    ? isCover(here.right) || isCover(there.left)
    : isCover(here.left) || isCover(there.right);
}

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
  hard,
  size,
}: {
  angle: MotionValue<number>;
  direction: TurnDirection;
  spread: boolean;
  front: Slot;
  back: Slot;
  hard: boolean;
  size: PageSize;
}) {
  // The leaf turns around the spine: left edge for "next" (and for a single page),
  // right edge when a left page turns back in a spread.
  const aroundRight = spread && direction === "prev";
  const rotateY = useTransform(angle, (value) =>
    aroundRight ? value : !spread && direction === "prev" ? -(180 - value) : -value,
  );
  const shade = useShade(angle, hard ? 0.2 : 0.32);
  const frontSide = spread ? (aroundRight ? "left" : "right") : "single";
  const backSide = spread ? (aroundRight ? "right" : "left") : "single";
  return (
    <motion.div
      aria-hidden="true"
      className={cn(
        "absolute top-0 z-20 [transform-style:preserve-3d] will-change-transform",
        hard && "drop-shadow-xl",
      )}
      style={{
        width: size.width,
        height: size.height,
        left: spread ? (aroundRight ? 0 : size.width) : 0,
        transformOrigin: aroundRight ? "right center" : "left center",
        rotateY,
      }}
    >
      <div className="absolute inset-0 [backface-visibility:hidden]">
        <PageFace slot={front ?? null} widthPx={size.width} side={frontSide} eager />
        <motion.span
          className="pointer-events-none absolute inset-0 bg-charcoal"
          style={{ opacity: shade }}
        />
      </div>
      <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
        <PageFace
          slot={spread ? (back ?? null) : null}
          widthPx={size.width}
          side={backSide}
          eager
        />
        <motion.span
          className="pointer-events-none absolute inset-0 bg-charcoal"
          style={{ opacity: shade }}
        />
      </div>
    </motion.div>
  );
}

/**
 * The open book (02-doc layout), face by face: covers, pages and the blank insides of
 * the covers (`utils/book-faces`). Turning animates only `transform` (rotateY of one
 * leaf) and `opacity` (its shading), so it stays at 60 fps on a mid-range phone; a
 * cover turns like board (slower, darker shadow). Only the visible spread, the turning
 * leaf and the next faces are mounted; neighbours wait in a hidden layer so their
 * images are loaded before they turn. With reduced motion the pages crossfade.
 *
 * `index` is a spread index (two pages) or a face index (one page).
 */
export function FlipBook({
  faces,
  slots,
  spread,
  size,
  index,
  reduced,
  turnRef,
  onTurned,
  onTap,
  onTurnStart,
  renderOverlay,
  zoomEnabled,
}: {
  faces: readonly Face[];
  slots: readonly Slot[];
  spread: boolean;
  size: PageSize;
  index: number;
  reduced: boolean;
  turnRef: RefObject<TurnFn | null>;
  onTurned: (index: number) => void;
  onTap: (zone: "left" | "middle" | "right") => void;
  onTurnStart?: () => void;
  renderOverlay?: (page: PublicHandbookPage) => ReactNode;
  zoomEnabled: boolean;
}) {
  const count = spread ? spreadCount(slots) : faces.length;
  const angle = useMotionValue(0);
  const [flip, setFlip] = useState<Flip | null>(null);
  const busy = useRef(false);
  const surface = useRef<HTMLDivElement>(null);

  const latest = useRef({ index, count, spread, slots, faces, reduced, onTurned, onTurnStart });
  useLayoutEffect(() => {
    latest.current = { index, count, spread, slots, faces, reduced, onTurned, onTurnStart };
  });
  const canTurn = (direction: TurnDirection) => {
    const { index: at, count: total } = latest.current;
    return direction === "next" ? at < total - 1 : at > 0;
  };
  const hardTurn = (direction: TurnDirection) => coverTurns(latest.current, direction);

  // --- zoom (one page, phones): pinch, double tap, pan ---
  const [zoom, setZoom] = useState({ scale: 1, x: 0, y: 0 });
  const zoomed = zoom.scale > 1.01;
  const zoomedRef = useRef(zoomed);
  useLayoutEffect(() => {
    zoomedRef.current = zoomed;
  });
  // A new face always opens unzoomed.
  const [zoomedAt, setZoomedAt] = useState(index);
  if (zoomedAt !== index) {
    setZoomedAt(index);
    setZoom({ scale: 1, x: 0, y: 0 });
  }

  const finish = useCallback(
    (direction: TurnDirection, commit: boolean, hard: boolean) => {
      const remaining = commit ? 180 - angle.get() : angle.get();
      const full = (FLIP_MS / 1000) * (hard ? HARD_COVER_SLOWDOWN : 1);
      const duration = Math.max(0.12, full * (remaining / 180));
      void animate(angle, commit ? 180 : 0, { duration, ease: EASE }).then(() => {
        if (commit) latest.current.onTurned(latest.current.index + (direction === "next" ? 1 : -1));
        setFlip(null);
        angle.set(0);
        busy.current = false;
      });
    },
    [angle],
  );

  const turn = useCallback<TurnFn>(
    (direction) => {
      const { index: at, count: total } = latest.current;
      const possible = direction === "next" ? at < total - 1 : at > 0;
      if (busy.current || !possible || zoomedRef.current) return;
      latest.current.onTurnStart?.();
      if (latest.current.reduced) {
        latest.current.onTurned(at + (direction === "next" ? 1 : -1));
        return;
      }
      const hard = coverTurns(latest.current, direction);
      busy.current = true;
      angle.set(0);
      setFlip({ direction, hard });
      requestAnimationFrame(() => finish(direction, true, hard));
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
    turning: Flip | null;
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
      g.turning = { direction, hard: hardTurn(direction) };
      busy.current = true;
      latest.current.onTurnStart?.();
      setFlip(g.turning);
    }
    if (g.turning) {
      const travel = spread ? size.width : size.width * 0.9;
      const progress = (g.turning.direction === "next" ? -dx : dx) / travel;
      angle.set(Math.min(180, Math.max(0, progress * 180)));
    }
  };

  const onPointerUp = (event: ReactPointerEvent) => {
    // A press that began on a hotspot is the hotspot's click, not a tap on the page.
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.delete(event.pointerId);
    const g = gesture.current;
    if (g.pinch) {
      if (pointers.current.size < 2) g.pinch = null;
      return;
    }
    if (g.turning) {
      const { direction, hard } = g.turning;
      g.turning = null;
      finish(direction, angle.get() > COMMIT_ANGLE, hard);
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
  let baseLeft: Slot;
  let baseRight: Slot;
  let baseSingle: Slot = faces[index];
  let front: Slot;
  let back: Slot;
  let preload: Slot[];
  if (spread) {
    const here = spreadAt(slots, index);
    const next = spreadAt(slots, index + 1);
    const prev = spreadAt(slots, index - 1);
    baseLeft = here.left;
    baseRight = here.right;
    if (flip?.direction === "next") {
      baseRight = next.right;
      front = here.right;
      back = next.left;
    } else if (flip?.direction === "prev") {
      baseLeft = prev.left;
      front = here.left;
      back = prev.right;
    }
    const after = spreadAt(slots, index + 2);
    preload = [next.left, next.right, prev.left, prev.right, after.left, after.right];
  } else {
    if (flip?.direction === "next") {
      baseSingle = faces[index + 1];
      front = faces[index];
    } else if (flip?.direction === "prev") {
      front = faces[index - 1];
    }
    preload = [faces[index + 1], faces[index + 2], faces[index - 1]];
  }

  const underShade = useShade(angle, 0.22);
  const bookWidth = spread ? size.width * 2 : size.width;
  // Pages already turned make the left block thicker, like a real book.
  const read = count > 1 ? index / (count - 1) : 0;
  const edge = (share: number) => Math.round(2 + share * 10);
  const overlayFor = (slot: Slot) => {
    const page = pageOf(slot);
    return !flip && !zoomed && page ? renderOverlay?.(page) : null;
  };

  return (
    <div className="relative" style={{ width: bookWidth, height: size.height }}>
      {spread ? (
        <>
          <span
            aria-hidden="true"
            className="absolute inset-y-1 rounded-l-md bg-[repeating-linear-gradient(90deg,var(--color-paper-edge)_0_1px,var(--color-paper)_1px_3px)]"
            style={{
              width: edge(read),
              left: -edge(read),
              opacity: baseLeft === undefined ? 0 : 1,
            }}
          />
          <span
            aria-hidden="true"
            className="absolute inset-y-1 rounded-r-md bg-[repeating-linear-gradient(90deg,var(--color-paper)_0_2px,var(--color-paper-edge)_2px_3px)]"
            style={{
              width: edge(1 - read),
              right: -edge(1 - read),
              opacity: baseRight === undefined ? 0 : 1,
            }}
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
          key={reduced ? index : "book"}
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
            <div className="flex h-full">
              <div
                className={cn("relative h-full", baseLeft !== undefined && "shadow-gallery")}
                style={{ width: size.width }}
              >
                <PageFace
                  slot={baseLeft}
                  widthPx={size.width}
                  side="left"
                  eager
                  overlay={overlayFor(baseLeft)}
                />
                {flip?.direction === "prev" && baseLeft !== undefined ? (
                  <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-charcoal"
                    style={{ opacity: underShade }}
                  />
                ) : null}
              </div>
              <div
                className={cn("relative h-full", baseRight !== undefined && "shadow-gallery")}
                style={{ width: size.width }}
              >
                <PageFace
                  slot={baseRight}
                  widthPx={size.width}
                  side="right"
                  eager
                  overlay={overlayFor(baseRight)}
                />
                {flip?.direction === "next" && baseRight !== undefined ? (
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
                slot={baseSingle ?? null}
                widthPx={zoomed ? size.width * zoom.scale : size.width}
                side="single"
                eager
                overlay={overlayFor(baseSingle)}
              />
            </div>
          )}
        </motion.div>

        {flip && front !== undefined ? (
          <Leaf
            angle={angle}
            direction={flip.direction}
            spread={spread}
            front={front}
            back={back}
            hard={flip.hard}
            size={size}
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
          .filter((slot): slot is Face => Boolean(slot))
          .map((slot) => (
            <div key={slot.id} className="absolute inset-0">
              <PageFace slot={slot} widthPx={size.width} side="single" eager />
            </div>
          ))}
      </div>
    </div>
  );
}
