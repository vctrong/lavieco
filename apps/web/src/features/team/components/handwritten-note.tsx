"use client";

import { motion } from "motion/react";

import { cn } from "@lavieco/ui";

import { CLOSE_MOTION, OPEN_MOTION } from "../constants/config";
import type { TeamNote } from "../types";
import { NoteArrow } from "./illustrations/note-arrow";

type HandwrittenNoteProps = {
  note: TeamNote;
  animated: boolean;
  /** True while the profile closes: the note fades out at once. */
  closing: boolean;
};

/**
 * A handwritten margin note: the text is "written" left to right (clip-path), its
 * arrow draws itself, then the whole note sways very slightly.
 */
export function HandwrittenNote({ note, animated, closing }: HandwrittenNoteProps) {
  const isLeft = note.side === "left";
  const { notesStart, noteWrite, noteArrow } = OPEN_MOTION;

  return (
    <motion.div
      data-keep-open
      initial={false}
      animate={{ opacity: closing ? 0 : 1 }}
      transition={{ duration: CLOSE_MOTION.content }}
      className={cn(
        "absolute z-20 font-handwriting leading-[1.7] tracking-wide text-canary transition-colors hover:text-emerald-brand",
        isLeft
          ? "-top-2 left-0 max-w-[15rem] text-base md:left-2 md:max-w-[17.5rem] md:text-lg"
          : "right-0 top-24 max-w-[11rem] text-right text-lg md:right-2 md:top-28 md:max-w-[13rem] md:text-xl",
      )}
    >
      <motion.div
        animate={animated ? { y: [0, -2.5, 0, 2.5, 0], rotate: [0, 0.4, 0, -0.4, 0] } : undefined}
        transition={
          animated
            ? { duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: notesStart + 1.4 }
            : undefined
        }
      >
        <motion.p
          initial={animated ? { clipPath: "inset(0 100% 0 0)" } : false}
          animate={animated ? { clipPath: "inset(0 0% 0 0)" } : undefined}
          transition={{ delay: notesStart, duration: noteWrite, ease: "linear" }}
        >
          {note.text}
        </motion.p>
        <div className={cn("mt-1 flex", !isLeft && "justify-end pr-3")}>
          <NoteArrow
            side={note.side}
            animated={animated}
            delay={notesStart + noteWrite}
            duration={noteArrow}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
