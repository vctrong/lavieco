import { FiFeather } from "react-icons/fi";

import { ArchFrame, ConcentricRings, PearlDot, cn } from "@lavieco/ui";

import { TEXT } from "../constants/text";

type CoverArtProps = {
  title: string;
  label?: string | null;
  radius?: "arch" | "arch-sm" | "arch-lg";
  className?: string;
};

/**
 * Illustrated arch shown in place of the cover photo.
 * TODO(media): render the uploaded cover with next/image once the media module exists (D1).
 */
export function CoverArt({ title, label, radius = "arch", className }: CoverArtProps) {
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
        {label ? (
          <span className="flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-museum">
            <PearlDot size="sm" tone="emerald" />
            {label}
          </span>
        ) : null}
      </div>
    </ArchFrame>
  );
}
