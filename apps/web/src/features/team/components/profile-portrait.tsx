"use client";

import Image from "next/image";
import { motion } from "motion/react";

import { cn } from "@lavieco/ui";

import {
  CLOSE_MOTION,
  EASE,
  GRID_PHOTO_BOTTOM_RADIUS,
  OPEN_MOTION,
  PROFILE_FRAME_RADIUS,
} from "../constants/config";
import { getPhotoAlt } from "../constants/members";
import type { TeamMember } from "../types";
import { HandwrittenNote } from "./handwritten-note";

export type ProfilePhase = "origin" | "open" | "closing";
export type Rect = { left: number; top: number; width: number; height: number };

type ProfilePortraitProps = {
  member: TeamMember;
  phase: ProfilePhase;
  /** Where the grid photo is: the frame starts and ends its flight here. */
  rect: Rect;
  reduced: boolean;
};

function radiiFor(rect: Rect, flying: boolean) {
  if (!flying) {
    const r = PROFILE_FRAME_RADIUS;
    return {
      borderTopLeftRadius: r,
      borderTopRightRadius: r,
      borderBottomLeftRadius: r,
      borderBottomRightRadius: r,
    };
  }
  const top = rect.width / 2;
  const bottom = GRID_PHOTO_BOTTOM_RADIUS;
  return {
    borderTopLeftRadius: top,
    borderTopRightRadius: top,
    borderBottomLeftRadius: bottom,
    borderBottomRightRadius: bottom,
  };
}

/**
 * Left column: the framed portrait plus handwritten notes. The frame is one
 * element that changes layout between "fixed on top of the grid photo" and
 * "in flow inside the profile"; Framer Motion animates that change (FLIP), so
 * the photo appears to fly up from the grid and back.
 */
export function ProfilePortrait({ member, phase, rect, reduced }: ProfilePortraitProps) {
  const flying = !reduced && phase !== "open";
  const closing = phase === "closing";

  const duration = reduced ? OPEN_MOTION.reduced : closing ? CLOSE_MOTION.frame : OPEN_MOTION.frame;
  const delay = closing && !reduced ? CLOSE_MOTION.frameDelay : 0;
  const transition = { duration, delay, ease: EASE };

  return (
    <section className="relative flex justify-center pb-4 pt-8">
      {member.notes?.slice(0, 2).map((note) => (
        <HandwrittenNote key={note.side} note={note} animated={!reduced} closing={closing} />
      ))}

      <motion.div
        layout={!reduced}
        data-keep-open
        initial={radiiFor(rect, true)}
        animate={radiiFor(rect, flying)}
        transition={{ ...transition, layout: transition }}
        style={
          flying
            ? {
                position: "fixed",
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
              }
            : undefined
        }
        className={cn(
          "overflow-hidden border border-soft-white/20 bg-deep-blue/60 shadow-portrait-halo",
          !flying && "relative aspect-[4/5] w-full max-w-[500px]",
        )}
      >
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 bg-radial from-transparent to-transparent",
            "via-soft-white/10",
          )}
        />

        <motion.div
          layout={!reduced}
          className="absolute inset-0"
          transition={{ layout: transition }}
        >
          <Image
            src={member.sticker.src}
            alt={getPhotoAlt(member)}
            fill
            sizes="(min-width: 1024px) 500px, 70vw"
            className="object-contain object-bottom px-3 pt-4 drop-shadow-sticker"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
