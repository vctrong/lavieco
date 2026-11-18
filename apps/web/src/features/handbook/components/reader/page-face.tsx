"use client";

import type { ReactNode } from "react";

import type { PublicHandbookPage } from "@lavieco/shared/content";
import { cn } from "@lavieco/ui";

import { MediaImage } from "@/shared/components/media-image";

import { TEXT } from "../../constants/text";

const r = TEXT.vi.reader;

/**
 * One side of a leaf: the designed page image on paper. `sizes` asks the loader for an
 * image as wide as the page really is on screen (×DPR), never larger (ADR-0020).
 */
export function PageFace({
  page,
  widthPx,
  side,
  eager = false,
  overlay,
}: {
  page: PublicHandbookPage | null;
  widthPx: number;
  side: "left" | "right" | "single";
  eager?: boolean;
  overlay?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden bg-paper",
        side === "left" && "rounded-l-md",
        side === "right" && "rounded-r-md",
        side === "single" && "rounded-md",
      )}
    >
      {page ? (
        <>
          <MediaImage
            publicId={page.image.publicId}
            alt={r.pageLabel(page.number, page.alt || page.title)}
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
      {/* Spine shading: the page curves into the gutter. */}
      {side === "left" ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-charcoal/20 to-transparent"
        />
      ) : null}
      {side === "right" ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-charcoal/25 to-transparent"
        />
      ) : null}
    </div>
  );
}
