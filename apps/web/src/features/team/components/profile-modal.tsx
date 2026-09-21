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
import { useZoomReveal } from "../hooks/use-zoom-reveal";
import type { TeamMember, ZoomSource } from "../types";
import { ProfileDetails } from "./profile-details";
import { ProfilePortrait, type ProfilePhase } from "./profile-portrait";

export type ProfileSession = {
  member: TeamMember;
  /** The card that opened the profile: focus returns to it on close. */
  trigger: HTMLElement | null;
  /** Measures the card's figure and arch now (called on open and again on close). */
  getSource: () => ZoomSource | null;
};

type ProfileModalProps = {
  session: ProfileSession;
  /** Called once the close animation has finished. */
  onClosed: () => void;
};

/**
 * Storyteller profile: a floating card that always fits the screen (`svh`) over a
 * translucent, blurred veil (the page stays faintly visible behind it). On open the
 * person zooms out of the card and the backdrop opens from the card's arch; the text
 * follows once the person is ~40% of the way. Closing plays it backwards, landing on the
 * card. Esc, the close button or a click outside close it. The text column scrolls only
 * when the viewport is too short for the content.
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
  // Lock first: the zoom measures the final layout, which must already be the locked one.
  useScrollLock(true);
  const zoom = useZoomReveal({
    getSource: session.getSource,
    stickerScale: member.stickerScale,
    reduced,
  });
  const scrollerRef = useRef<HTMLDivElement>(null);
  const hasMore = useScrollHint(scrollerRef);

  useFocusTrap(rootRef, true);

  useEffect(() => {
    closeButtonRef.current?.focus({ preventScroll: true });
  }, []);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setPhase("closing");
    void zoom.close().then(onClosed);
  }, [zoom, onClosed]);

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
  const fade = (open: number, close: number, delay = 0) => ({
    duration: reduced ? OPEN_MOTION.reduced : closing ? close : open,
    delay: reduced || !closing ? 0 : delay,
    ease: EASE,
  });

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={nameId}
      onClick={handleRootClick}
      className={cn("fixed inset-0 z-[70] grid place-items-center", handwriting.variable)}
    >
      {/* Translucent veil: only its opacity animates (the blur radius stays fixed). */}
      <motion.div
        aria-hidden="true"
        className="modal-scrim absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: closing ? 0 : 1 }}
        transition={fade(OPEN_MOTION.scrim, CLOSE_MOTION.scrim)}
      />

      {/* The frame has no fill and no clip: the flying portrait may leave it. */}
      <div data-keep-open className={cn("@container relative", PROFILE_PANEL_SIZE)}>
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 rounded-[2rem] bg-soft-white shadow-phone"
          initial={{ opacity: 0 }}
          animate={{ opacity: closing ? 0 : 1 }}
          transition={fade(OPEN_MOTION.panel, CLOSE_MOTION.panel, CLOSE_MOTION.panelDelay)}
        />

        <div className="relative grid h-full grid-rows-[minmax(0,32svh)_minmax(0,1fr)] landscape:@2xl:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] landscape:@2xl:grid-rows-1">
          <ProfilePortrait
            member={member}
            flyerRef={zoom.flyerRef}
            nobgRef={zoom.nobgRef}
            stickerRef={zoom.stickerRef}
            backdropRef={zoom.backdropRef}
          />

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
                "pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-br-[2rem] bg-gradient-to-t from-soft-white to-transparent transition-opacity duration-300",
                hasMore ? "opacity-100" : "opacity-0",
              )}
            />
          </div>
        </div>

        <motion.button
          ref={closeButtonRef}
          type="button"
          aria-label={t.closeLabel}
          onClick={requestClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: closing ? 0 : 1 }}
          transition={{
            duration: closing ? CLOSE_MOTION.content : OPEN_MOTION.item,
            delay: closing ? 0 : OPEN_MOTION.textStart,
          }}
          className="absolute right-3 top-3 z-30 grid size-10 place-items-center rounded-full border border-hairline bg-soft-white/85 text-deep-blue transition-colors hover:border-deep-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-brand"
        >
          <FiX aria-hidden="true" size={18} />
        </motion.button>
      </div>
    </div>,
    document.body,
  );
}
