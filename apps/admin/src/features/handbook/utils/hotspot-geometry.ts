/**
 * Hotspot rectangles in percent of the page (ADR-0029), so one rectangle lands on the
 * same spot at every display size. Pure helpers for drawing, moving and resizing.
 */

export type Rect = { x: number; y: number; w: number; h: number };
export type Point = { x: number; y: number };
export type Handle = "nw" | "ne" | "sw" | "se";

export const MIN_SIZE = 2;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 100) / 100;

const tidy = (rect: Rect): Rect => ({
  x: round(rect.x),
  y: round(rect.y),
  w: round(rect.w),
  h: round(rect.h),
});

/** A point of a pointer event inside an element, in percent of its box. */
export function toPercent(clientX: number, clientY: number, box: DOMRect): Point {
  return {
    x: clamp(((clientX - box.left) / box.width) * 100, 0, 100),
    y: clamp(((clientY - box.top) / box.height) * 100, 0, 100),
  };
}

/** Rectangle spanned by a drag from `a` to `b`, in any direction. */
export function rectFromDrag(a: Point, b: Point): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return tidy({ x, y, w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) });
}

/** A drag too small to be meant as a rectangle (a click). */
export function isTooSmall(rect: Rect): boolean {
  return rect.w < MIN_SIZE || rect.h < MIN_SIZE;
}

/** Moves a rectangle by `dx`, `dy` percent, never outside the page. */
export function moveRect(rect: Rect, dx: number, dy: number): Rect {
  return tidy({
    ...rect,
    x: clamp(rect.x + dx, 0, 100 - rect.w),
    y: clamp(rect.y + dy, 0, 100 - rect.h),
  });
}

/** Drags one corner to `to`; the opposite corner stays put. */
export function resizeRect(rect: Rect, handle: Handle, to: Point): Rect {
  const left = handle === "nw" || handle === "sw" ? to.x : rect.x;
  const right = handle === "ne" || handle === "se" ? to.x : rect.x + rect.w;
  const top = handle === "nw" || handle === "ne" ? to.y : rect.y;
  const bottom = handle === "sw" || handle === "se" ? to.y : rect.y + rect.h;
  const x = clamp(Math.min(left, right - MIN_SIZE), 0, 100 - MIN_SIZE);
  const y = clamp(Math.min(top, bottom - MIN_SIZE), 0, 100 - MIN_SIZE);
  const w = clamp(Math.max(right, x + MIN_SIZE) - x, MIN_SIZE, 100 - x);
  const h = clamp(Math.max(bottom, y + MIN_SIZE) - y, MIN_SIZE, 100 - y);
  return tidy({ x, y, w, h });
}

/** Keyboard nudge: arrow keys move by 1 %, with Shift they grow or shrink. */
export function nudgeRect(rect: Rect, key: string, resize: boolean): Rect | null {
  const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[key];
  if (!step) return null;
  const [dx, dy] = step as [number, number];
  if (!resize) return moveRect(rect, dx, dy);
  return tidy({
    ...rect,
    w: clamp(rect.w + dx, MIN_SIZE, 100 - rect.x),
    h: clamp(rect.h + dy, MIN_SIZE, 100 - rect.y),
  });
}
