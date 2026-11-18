"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import type { HandbookHotspot } from "@lavieco/shared/content";
import { cn } from "@lavieco/ui";

import { MediaImage } from "@/shared/components/media-image";

import { TEXT } from "../constants/text";
import {
  isTooSmall,
  moveRect,
  nudgeRect,
  rectFromDrag,
  resizeRect,
  toPercent,
  type Handle,
  type Point,
  type Rect,
} from "../utils/hotspot-geometry";

const t = TEXT.vi.inspector;
const HANDLES: Handle[] = ["nw", "ne", "sw", "se"];
const HANDLE_POSITION: Record<Handle, string> = {
  nw: "-left-2 -top-2 cursor-nwse-resize",
  ne: "-right-2 -top-2 cursor-nesw-resize",
  sw: "-left-2 -bottom-2 cursor-nesw-resize",
  se: "-right-2 -bottom-2 cursor-nwse-resize",
};

type Gesture =
  | { kind: "draw"; start: Point; current: Point }
  | { kind: "move"; id: string; start: Point; origin: Rect }
  | { kind: "resize"; id: string; handle: Handle; origin: Rect };

const rectOf = (spot: HandbookHotspot): Rect => ({ x: spot.x, y: spot.y, w: spot.w, h: spot.h });
const box = (rect: Rect) => ({
  left: `${rect.x}%`,
  top: `${rect.y}%`,
  width: `${rect.w}%`,
  height: `${rect.h}%`,
});

/**
 * The page image with its hotspots: drag on empty space to draw a rectangle, drag a
 * rectangle to move it, drag a corner to resize it. Arrow keys move the selected one
 * (Shift + arrows resize), for people who do not use a mouse.
 */
export function HotspotCanvas({
  publicId,
  alt,
  width,
  height,
  hotspots,
  selectedId,
  disabled,
  onSelect,
  onCreate,
  onChange,
}: {
  publicId: string;
  alt: string;
  width: number;
  height: number;
  hotspots: HandbookHotspot[];
  selectedId: string | null;
  disabled: boolean;
  onSelect: (id: string | null) => void;
  onCreate: (rect: Rect) => void;
  onChange: (id: string, rect: Rect) => void;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const [gesture, setGesture] = useState<Gesture | null>(null);

  const point = (event: PointerEvent) =>
    toPercent(event.clientX, event.clientY, surface.current!.getBoundingClientRect());

  const begin = (event: PointerEvent, next: Gesture) => {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    surface.current?.setPointerCapture(event.pointerId);
    setGesture(next);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!gesture) return;
    const at = point(event);
    if (gesture.kind === "draw") setGesture({ ...gesture, current: at });
    else if (gesture.kind === "move") {
      onChange(
        gesture.id,
        moveRect(gesture.origin, at.x - gesture.start.x, at.y - gesture.start.y),
      );
    } else onChange(gesture.id, resizeRect(gesture.origin, gesture.handle, at));
  };

  const onPointerUp = () => {
    if (gesture?.kind === "draw") {
      const rect = rectFromDrag(gesture.start, gesture.current);
      if (isTooSmall(rect)) onSelect(null);
      else onCreate(rect);
    }
    setGesture(null);
  };

  const onKeyDown = (event: KeyboardEvent, spot: HandbookHotspot) => {
    if (disabled) return;
    const next = nudgeRect(rectOf(spot), event.key, event.shiftKey);
    if (!next) return;
    event.preventDefault();
    onChange(spot.id, next);
  };

  const drawing = gesture?.kind === "draw" ? rectFromDrag(gesture.start, gesture.current) : null;

  return (
    <div
      ref={surface}
      role="group"
      aria-label={t.canvasLabel}
      onPointerDown={(event) => {
        const start = point(event);
        begin(event, { kind: "draw", start, current: start });
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setGesture(null)}
      className={cn(
        "relative w-full touch-none select-none overflow-hidden rounded-xl bg-paper shadow-sm",
        disabled ? "cursor-default" : "cursor-crosshair",
      )}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <MediaImage
        publicId={publicId}
        alt={alt}
        fill
        sizes="(min-width: 1024px) 420px, 90vw"
        draggable={false}
      />
      {hotspots.map((spot, index) => {
        const selected = spot.id === selectedId;
        return (
          <div
            key={spot.id}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            aria-label={t.selectHotspot(index + 1, spot.label)}
            onPointerDown={(event) => {
              onSelect(spot.id);
              begin(event, {
                kind: "move",
                id: spot.id,
                start: point(event),
                origin: rectOf(spot),
              });
            }}
            onKeyDown={(event) => onKeyDown(event, spot)}
            onFocus={() => onSelect(spot.id)}
            className={cn(
              "absolute rounded-md border-2 outline-none focus-visible:ring-2 focus-visible:ring-deep-blue",
              selected
                ? "cursor-move border-emerald-brand bg-emerald-brand/20"
                : "cursor-pointer border-canary bg-canary/20",
            )}
            style={box(rectOf(spot))}
          >
            <span className="absolute -top-6 left-0 max-w-[12rem] truncate rounded-full bg-deep-blue px-2 py-0.5 text-[11px] font-semibold text-soft-white">
              {index + 1}. {spot.label}
            </span>
            {selected && !disabled
              ? HANDLES.map((handle) => (
                  <span
                    key={handle}
                    aria-hidden="true"
                    onPointerDown={(event) =>
                      begin(event, { kind: "resize", id: spot.id, handle, origin: rectOf(spot) })
                    }
                    className={cn(
                      "absolute size-4 rounded-full border-2 border-white bg-emerald-brand shadow",
                      HANDLE_POSITION[handle],
                    )}
                  />
                ))
              : null}
          </div>
        );
      })}
      {drawing ? (
        <div
          aria-hidden="true"
          className="absolute rounded-md border-2 border-dashed border-emerald-brand bg-emerald-brand/10"
          style={box(drawing)}
        />
      ) : null}
    </div>
  );
}
