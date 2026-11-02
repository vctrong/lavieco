import Image from "next/image";
import { FiFeather } from "react-icons/fi";

import type { EventImage as EventImageData } from "@lavieco/shared/events";
import { ConcentricRings, cn } from "@lavieco/ui";

import { MEDIA_DELIVERY_READY, MediaImage } from "@/shared/components/media-image";

import { DEFAULT_EVENT_BANNER } from "../constants/config";
import { TEXT } from "../constants/text";

type EventImageProps = {
  title: string;
  image: EventImageData | null;
  /** `sizes` of the photo, matching the layout it sits in. */
  sizes: string;
  /** Above the fold (hero, featured banner): load early (Next 16 `preload`). */
  preload?: boolean;
  /** Ratio, radius and size come from the caller. */
  className?: string;
  /**
   * `contain`: the whole photo over a blurred copy of itself, for a poster whose shape
   * differs from the frame (a 1:1 poster in the 4:5 card).
   */
  fit?: "cover" | "contain";
  /** What an event without this image shows: the brand illustration or the default banner. */
  fallback?: "illustration" | "banner";
};

/**
 * An uploaded event image (ADR-0020), or a quiet illustration when there is none (or
 * images are not configured on this machine). The frame never collapses either way.
 */
export function EventImage({
  title,
  image,
  sizes,
  preload = false,
  className,
  fit = "cover",
  fallback = "illustration",
}: EventImageProps) {
  if (image && MEDIA_DELIVERY_READY) {
    return (
      <div className={cn("relative overflow-hidden bg-mint-mist", className)}>
        {fit === "contain" ? (
          <MediaImage
            publicId={image.publicId}
            alt=""
            aria-hidden="true"
            fill
            sizes="160px"
            className="scale-110 object-cover blur-xl"
          />
        ) : null}
        <MediaImage
          publicId={image.publicId}
          alt={image.alt}
          fill
          sizes={sizes}
          preload={preload}
          className={fit === "contain" ? "object-contain" : "object-cover"}
        />
      </div>
    );
  }
  if (fallback === "banner") {
    return (
      <div className={cn("relative overflow-hidden bg-mint-mist", className)}>
        <Image
          src={DEFAULT_EVENT_BANNER.url}
          alt={TEXT.vi.coverAlt(title)}
          fill
          sizes={sizes}
          preload={preload}
          className="object-cover"
        />
      </div>
    );
  }
  return (
    <div
      role="img"
      aria-label={TEXT.vi.coverAlt(title)}
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-mint-mist via-soft-white to-mint-mist",
        className,
      )}
    >
      <ConcentricRings radii={[60, 110, 160, 210]} className="text-emerald-brand/25" />
      <span className="relative flex size-14 items-center justify-center rounded-full bg-white/80 text-deep-blue/70 shadow-ambient">
        <FiFeather aria-hidden="true" size={22} />
      </span>
    </div>
  );
}
