"use client";

import type { ReactNode } from "react";

import { cn } from "@lavieco/ui";

import { MediaImage } from "@/shared/components/media-image";

import { TEXT } from "../../constants/text";
import type { Slot } from "../../utils/book-faces";

const r = TEXT.vi.reader;

/**
 * One side of a leaf: a designed page, a cover, or blank paper (the inside of a cover).
 * `sizes` asks the loader for an image as wide as the face really is on screen (×DPR),
 * never larger (ADR-0020). Covers look like board: rounded outer corners, a darker
 * hinge and a stronger shadow; pages look like paper.
 */
export function PageFace({
  slot,
  widthPx,
  side,
  eager = false,
  overlay,
}: {
  slot: Slot;
  widthPx: number;
  side: "left" | "right" | "single";
  eager?: boolean;
  overlay?: ReactNode;
}) {
  // Nothing at all: the closed side of the book.
  if (slot === undefined) return null;
  const cover = slot?.type === "cover";
  const image =
    slot?.type === "page" ? slot.page.image : slot?.type === "cover" ? slot.image : null;
  const alt =
    slot?.type === "page"
      ? r.pageLabel(slot.page.number, slot.page.alt || slot.page.title)
      : slot?.type === "cover"
        ? slot.side === "front"
          ? r.frontCover
          : r.backCover
        : "";
  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden",
        cover ? "bg-deep-blue" : "bg-paper",
        side === "left" && (cover ? "rounded-l-xl" : "rounded-l-md"),
        side === "right" && (cover ? "rounded-r-xl" : "rounded-r-md"),
        side === "single" && (cover ? "rounded-xl" : "rounded-md"),
      )}
    >
      {image ? (
        <>
          <MediaImage
            publicId={image.publicId}
            alt={alt}
            fill
            draggable={false}
            sizes={`${Math.max(160, Math.round(widthPx))}px`}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            className="select-none object-cover"
          />
          {overlay}
        </>
      ) : (
        <span className="sr-only">{r.blankPage}</span>
      )}
      {/* Spine shading: paper curves into the gutter, board shows a hinge groove. */}
      {side === "left" ? (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 bg-gradient-to-l to-transparent",
            cover ? "w-6 from-charcoal/40" : "w-10 from-charcoal/20",
          )}
        />
      ) : null}
      {side === "right" ? (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 bg-gradient-to-r to-transparent",
            cover ? "w-6 from-charcoal/40" : "w-10 from-charcoal/25",
          )}
        />
      ) : null}
      {cover ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-charcoal/25"
        />
      ) : null}
    </div>
  );
}
