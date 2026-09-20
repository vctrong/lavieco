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
import { TEXT } from "../constants/text";
import { getFullName } from "../constants/members";
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
  const t = TEXT.vi;
  const name = getFullName(member);
  const flying = !reduced && phase !== "open";
  const closing = phase === "closing";
  const hasSticker = Boolean(member.sticker);
  const open = phase === "open";

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
            hasSticker ? "via-soft-white/10" : "via-soft-white/5",
          )}
        />

        <motion.div
          layout={!reduced}
          className="absolute inset-0"
          initial={false}
          animate={{ opacity: hasSticker && open ? 0 : 1 }}
          transition={{
            duration: OPEN_MOTION.stickerDuration,
            delay: hasSticker && open ? OPEN_MOTION.stickerDelay : 0,
            ease: EASE,
            // Same timing as the frame, so the photo keeps filling it during the flight.
            layout: transition,
          }}
        >
          <Image
            src={member.photo.src}
            alt={`${t.photoAltPrefix} ${name}`}
            fill
            sizes="(min-width: 1024px) 500px, 70vw"
            className="object-cover object-top"
          />
        </motion.div>

        {member.sticker ? (
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 flex items-end justify-center"
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={open ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 16, scale: 0.94 }}
            transition={{
              duration: open ? OPEN_MOTION.stickerDuration : 0.2,
              delay: open ? OPEN_MOTION.stickerDelay : 0,
              ease: EASE,
            }}
          >
            <Image
              src={member.sticker.src}
              alt=""
              width={member.sticker.width}
              height={member.sticker.height}
              sizes="(min-width: 1024px) 480px, 70vw"
              className="h-[96%] w-auto max-w-[92%] object-contain drop-shadow-sticker"
            />
          </motion.div>
        ) : null}
      </motion.div>
    </section>
  );
}
