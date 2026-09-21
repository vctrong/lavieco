"use client";

import Image from "next/image";
import type { CSSProperties, RefObject } from "react";

import { cn } from "@lavieco/ui";

import { TEAM_BACKDROP_BG } from "../constants/config";
import { getPhotoAlt } from "../constants/members";
import type { TeamMember } from "../types";
import { Backdrop } from "./illustrations/backdrops";

export type ProfilePhase = "open" | "closing";

type ProfilePortraitProps = {
  member: TeamMember;
  flyerRef: RefObject<HTMLDivElement | null>;
  nobgRef: RefObject<HTMLImageElement | null>;
  stickerRef: RefObject<HTMLImageElement | null>;
  backdropRef: RefObject<HTMLDivElement | null>;
};

/**
 * Left column: the person on their own backdrop. The person is drawn in a box that has the
 * sticker's proportions and is sized with container units, so it is exactly "contain,
 * bottom-aligned" without an `object-fit` box that would hide its real rectangle. That box
 * is what flies in from the card; both images are stacked in it and cross-fade near the
 * end. Neither this section nor the frame clips, so the flight is never cut off. The
 * sticker image only exists while a profile is open, so it is never downloaded up front.
 */
export function ProfilePortrait({
  member,
  flyerRef,
  nobgRef,
  stickerRef,
  backdropRef,
}: ProfilePortraitProps) {
  const { portraitDetail: sticker, portraitList: nobg, stickerScale } = member;
  const aspect = sticker.width / sticker.height;
  const nobgShare = nobg.width / sticker.width;

  return (
    <section
      className={cn(
        "relative min-h-0 [container-type:size]",
        "[--profile-radius:2rem_2rem_0_0] landscape:@2xl:[--profile-radius:2rem_0_0_2rem]",
      )}
    >
      <div
        ref={backdropRef}
        className={cn(
          "absolute inset-0 overflow-hidden rounded-[var(--profile-radius)]",
          TEAM_BACKDROP_BG[member.backdrop],
        )}
      >
        <Backdrop name={member.backdrop} />
      </div>

      <div
        ref={flyerRef}
        style={
          {
            "--fh": `min(calc(100cqh - 1rem), calc(100cqw / ${aspect}))`,
            width: `calc(var(--fh) * ${aspect})`,
            height: "var(--fh)",
          } as CSSProperties
        }
        className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto"
      >
        <Image
          ref={stickerRef}
          src={sticker.src}
          width={sticker.width}
          height={sticker.height}
          alt={getPhotoAlt(member)}
          sizes="(min-width: 1024px) 480px, 90vw"
          draggable={false}
          className="absolute inset-0 size-full drop-shadow-sticker"
        />
        {/* Only visible during the flight: the borderless cutout, scaled to the person's size in the sticker. */}
        <Image
          ref={nobgRef}
          src={nobg.src}
          width={nobg.width}
          height={nobg.height}
          alt=""
          aria-hidden="true"
          sizes="(min-width: 768px) 30vw, 80vw"
          draggable={false}
          style={{
            width: `${nobgShare * 100}%`,
            left: `${((1 - nobgShare) / 2) * 100}%`,
            scale: stickerScale,
          }}
          className="absolute top-0 h-full max-w-none opacity-0"
        />
      </div>
    </section>
  );
}
