"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import type { PublicHandbookHotspot, PublicHandbookPage } from "@lavieco/shared/content";
import { cn } from "@lavieco/ui";

import { TEXT } from "../../constants/text";
import { agentHrefFor } from "../../utils/links";

const h = TEXT.vi.hotspots;

const boxOf = (spot: PublicHandbookHotspot): CSSProperties => ({
  left: `${spot.x}%`,
  top: `${spot.y}%`,
  width: `${spot.w}%`,
  height: `${spot.h}%`,
});

/**
 * Clickable areas drawn by the editors on a page (ADR-0029). Invisible until hovered,
 * focused, or for a moment after a tap on the page (`reveal`), so the designed page
 * stays clean. Each one is a real link or button with a spoken name.
 */
export function HotspotLayer({
  page,
  reveal,
  onPage,
  onVideo,
}: {
  page: PublicHandbookPage;
  reveal: boolean;
  onPage: (number: number) => void;
  onVideo: (spot: PublicHandbookHotspot & { target: { type: "video" } }) => void;
}) {
  if (page.hotspots.length === 0) return null;
  return (
    <div className="absolute inset-0">
      {page.hotspots.map((spot) => {
        const className = cn(
          "absolute rounded-lg border-2 border-emerald-brand bg-emerald-brand/15 transition-opacity duration-300 motion-reduce:transition-none",
          "opacity-0 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none",
          reveal && "opacity-70",
        );
        const common = {
          "data-hotspot": "",
          title: spot.label,
          className,
          style: boxOf(spot),
        };
        const target = spot.target;
        switch (target.type) {
          case "product":
            return (
              <Link
                key={spot.id}
                href={`/bo-suu-tap/${target.slug}`}
                aria-label={h.product(target.title)}
                {...common}
              />
            );
          case "page":
            return (
              <button
                key={spot.id}
                type="button"
                aria-label={`${spot.label}. ${h.page(target.number)}`}
                onClick={() => onPage(target.number)}
                {...common}
              />
            );
          case "video":
            return (
              <button
                key={spot.id}
                type="button"
                aria-label={`${spot.label}. ${h.video}`}
                onClick={() => onVideo({ ...spot, target })}
                {...common}
              />
            );
          case "url":
            return (
              <a
                key={spot.id}
                href={target.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${spot.label} ${h.newTab}`}
                {...common}
              />
            );
          case "laviagent":
            return (
              <Link
                key={spot.id}
                href={agentHrefFor(page.key, target.prompt)}
                aria-label={`${spot.label}. ${h.laviagent}`}
                {...common}
              />
            );
        }
      })}
    </div>
  );
}
