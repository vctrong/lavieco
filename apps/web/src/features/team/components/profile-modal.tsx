"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

import { cn } from "@lavieco/ui";

import {
  CLOSE_MOTION,
  EASE,
  OPEN_MOTION,
  PROFILE_PANEL_SIZE,
  PROFILE_SCALE,
} from "../constants/config";
import { TEXT } from "../constants/text";
import { handwriting } from "../fonts";
import { useFocusTrap } from "../hooks/use-focus-trap";
import { useScrollHint } from "../hooks/use-scroll-hint";
import { useScrollLock } from "../hooks/use-scroll-lock";
import type { TeamMember } from "../types";
import { ProfileDetails } from "./profile-details";
import { ProfilePortrait, type ProfilePhase } from "./profile-portrait";

export type ProfileSession = {
  member: TeamMember;
  /** The card that opened the profile: focus returns to it on close. */
  trigger: HTMLElement | null;
};

type ProfileModalProps = {
  session: ProfileSession;
  /** Called once the close animation has finished. */
  onClosed: () => void;
};

/**
 * Storyteller profile: one panel that always fits the screen (`svh`). Two columns (portrait
 * on its own backdrop, text) when the panel is wide and landscape, stacked otherwise. It
 * fades in with a small rise and fades out; Esc, the close button or a click outside close
 * it. The text column scrolls only when the viewport is too short for the content.
 */
export function ProfileModal({ session, onClosed }: ProfileModalProps) {
  const t = TEXT.vi.profile;
  const { member } = session;
  const reduced = useReducedMotion() ?? false;
  const nameId = useId();

  const [phase, setPhase] = useState<ProfilePhase>("open");
  const closingRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const hasMore = useScrollHint(scrollerRef);

  useScrollLock(true);
  useFocusTrap(rootRef, true);

  useEffect(() => {
    closeButtonRef.current?.focus({ preventScroll: true });
  }, []);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setPhase("closing");
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [requestClose]);

  const handleRootClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof Element && target.closest("[data-keep-open]")) return;
    requestClose();
  };

  const closing = phase === "closing";
  const duration = reduced ? OPEN_MOTION.reduced : closing ? CLOSE_MOTION.panel : OPEN_MOTION.panel;
  const scrimDuration = reduced
    ? OPEN_MOTION.reduced
    : closing
      ? CLOSE_MOTION.scrim
      : OPEN_MOTION.scrim;

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={nameId}
      onClick={handleRootClick}
      className={cn("fixed inset-0 z-[70] grid place-items-center", handwriting.variable)}
    >
      <motion.div
        aria-hidden="true"
        className="modal-scrim absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: closing ? 0 : 1 }}
        transition={{ duration: scrimDuration, ease: EASE }}
        onAnimationComplete={() => {
          if (closingRef.current) onClosed();
        }}
      />

      <motion.div
        data-keep-open
        initial={{ opacity: 0, y: reduced ? 0 : 14 }}
        animate={closing ? { opacity: 0, y: reduced ? 0 : 8 } : { opacity: 1, y: 0 }}
        transition={{ duration, ease: EASE }}
        className={cn(
          "@container relative overflow-hidden rounded-3xl border border-soft-white/15 bg-deep-blue shadow-portrait-halo",
          PROFILE_PANEL_SIZE,
        )}
      >
        <div className="grid h-full grid-rows-[minmax(0,32svh)_minmax(0,1fr)] landscape:@2xl:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] landscape:@2xl:grid-rows-1">
          <ProfilePortrait member={member} />

          <div className="relative min-h-0 [container:text/size]">
            <div
              ref={scrollerRef}
              className={cn("h-full overflow-y-auto overscroll-contain", PROFILE_SCALE.pad)}
            >
              <ProfileDetails member={member} phase={phase} reduced={reduced} nameId={nameId} />
            </div>
            {/* Only shown when the content is taller than the column (very short viewports). */}
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-deep-blue to-transparent transition-opacity duration-300",
                hasMore ? "opacity-100" : "opacity-0",
              )}
            />
          </div>
        </div>

        <button
          ref={closeButtonRef}
          type="button"
          aria-label={t.closeLabel}
          onClick={requestClose}
          className="absolute right-3 top-3 z-30 grid size-10 place-items-center rounded-full border border-soft-white/40 bg-deep-blue/70 text-soft-white transition-colors hover:border-soft-white hover:bg-deep-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-brand"
        >
          <FiX aria-hidden="true" size={18} />
        </button>
      </motion.div>
    </div>,
    document.body,
  );
}
