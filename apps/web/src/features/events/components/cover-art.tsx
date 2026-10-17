import { FiFeather } from "react-icons/fi";

import type { EventImage } from "@lavieco/shared/events";
import { ArchFrame, ConcentricRings, PearlDot, cn } from "@lavieco/ui";

import { MEDIA_DELIVERY_READY, MediaImage } from "@/shared/components/media-image";

import { TEXT } from "../constants/text";

type CoverArtProps = {
  title: string;
  cover?: EventImage | null;
  label?: string | null;
  radius?: "arch" | "arch-sm" | "arch-lg";
  /** `sizes` of the photo, matching the layout it sits in. */
  sizes?: string;
  /** Above the fold (event page hero): load early (Next 16 `preload`). */
  preload?: boolean;
  className?: string;
};

function TypeLabel({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-museum text-deep-blue/80">
      <PearlDot size="sm" tone="emerald" />
      {label}
    </span>
  );
}

/**
 * The uploaded cover photo (ADR-0020), or the illustrated arch when the event has
 * none (or images are not configured on this machine).
 */
export function CoverArt({
  title,
  cover,
  label,
  radius = "arch",
  sizes = "(min-width: 768px) 40vw, 100vw",
  preload = false,
  className,
}: CoverArtProps) {
  if (cover && MEDIA_DELIVERY_READY) {
    return (
      <ArchFrame radius={radius} className={cn("relative bg-mint-mist", className)}>
        <MediaImage
          publicId={cover.publicId}
          alt={cover.alt}
          fill
          sizes={sizes}
          preload={preload}
          className="object-cover"
        />
        {label ? (
          <div className="absolute inset-x-0 bottom-6 flex justify-center">
            <TypeLabel label={label} />
          </div>
        ) : null}
      </ArchFrame>
    );
  }
  return (
    <ArchFrame
      radius={radius}
      role="img"
      aria-label={TEXT.vi.coverAlt(title)}
      className={cn(
        "relative flex items-end justify-center bg-gradient-to-b from-mint-mist via-soft-white to-mint-mist",
        className,
      )}
    >
      <ConcentricRings radii={[60, 110, 160, 210]} className="text-emerald-brand/25" />
      <div className="relative mb-8 flex flex-col items-center gap-3 text-deep-blue/70">
        <span className="flex size-14 items-center justify-center rounded-full bg-white/80 shadow-ambient">
          <FiFeather aria-hidden="true" size={22} />
        </span>
        {label ? <TypeLabel label={label} /> : null}
      </div>
    </ArchFrame>
  );
}
