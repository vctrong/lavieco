"use client";

import Image from "next/image";

import { cn } from "@lavieco/ui";

import { TEAM_BACKDROP_BG } from "../constants/config";
import { getPhotoAlt } from "../constants/members";
import type { TeamMember } from "../types";
import { Backdrop } from "./illustrations/backdrops";

export type ProfilePhase = "open" | "closing";

type ProfilePortraitProps = {
  member: TeamMember;
};

/**
 * Left column: the person's white-outlined sticker on their own backdrop. The image is
 * only rendered while a profile is open, so the six stickers are never downloaded up
 * front.
 */
export function ProfilePortrait({ member }: ProfilePortraitProps) {
  return (
    <section className={cn("relative min-h-0 overflow-hidden", TEAM_BACKDROP_BG[member.backdrop])}>
      <Backdrop name={member.backdrop} />
      <Image
        src={member.portraitDetail.src}
        alt={getPhotoAlt(member)}
        fill
        sizes="(min-width: 1024px) 480px, 90vw"
        className="object-contain object-bottom p-[clamp(0.5rem,2.4svh,1.5rem)] pb-0 drop-shadow-sticker"
      />
    </section>
  );
}
