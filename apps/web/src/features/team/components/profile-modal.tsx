"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

import { cn } from "@lavieco/ui";

import { CLOSE_MOTION, EASE, OPEN_MOTION } from "../constants/config";
import { TEXT } from "../constants/text";
import { handwriting } from "../fonts";
import { useFocusTrap } from "../hooks/use-focus-trap";
import { useScrollLock } from "../hooks/use-scroll-lock";
import type { TeamMember } from "../types";
import { ProfileDetails } from "./profile-details";
import { ProfilePortrait, type ProfilePhase, type Rect } from "./profile-portrait";

export type ProfileSession = {
  member: TeamMember;
  /** Current on-screen box of the grid photo (measured when needed). */
  getOrigin: () => Rect;
  trigger: HTMLElement | null;
};

type ProfileModalProps = {
  session: ProfileSession;
  /** Called once the close animation has finished. */
  onClosed: () => void;
};

/**
 * Full-screen storyteller profile. Opens by flying the grid photo into the portrait
 * frame; closes by flying it back. Everything sits directly on a blurred scrim
 * (no card), and clicking outside the content, the close button or Esc closes it.
 */
export function ProfileModal({ session, onClosed }: ProfileModalProps) {
  const t = TEXT.vi.profile;
  const { member } = session;
  const reduced = useReducedMotion() ?? false;
  const nameId = useId();

  const [phase, setPhase] = useState<ProfilePhase>(reduced ? "open" : "origin");
  const [rect, setRect] = useState<Rect>(() => session.getOrigin());
  const closingRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useScrollLock(true);
  useFocusTrap(rootRef, true);

  // Commit the "on top of the grid photo" layout first, then switch to the final one.
  useEffect(() => {
    if (phase !== "origin") return;
    let inner = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => setPhase("open"));
    });
    return () => {
      window.cancelAnimationFrame(outer);
      window.cancelAnimationFrame(inner);
    };
  }, [phase]);

  useEffect(() => {
    closeButtonRef.current?.focus({ preventScroll: true });
  }, []);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setRect(session.getOrigin());
    setPhase("closing");
  }, [session]);

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
      className={cn("fixed inset-0 z-[70]", handwriting.variable)}
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
        className="absolute right-4 top-4 z-30 grid size-11 place-items-center rounded-full border border-soft-white/30 bg-soft-white/5 text-mint-mist transition-colors hover:border-soft-white/60 hover:text-soft-white md:right-8 md:top-8"
      >
        <FiX aria-hidden="true" size={20} />
      </motion.button>

      <div className="absolute inset-0 overflow-y-auto overscroll-contain">
        <div className="mx-auto grid min-h-full max-w-[1240px] grid-cols-1 content-start gap-10 px-6 py-20 md:px-12 lg:grid-cols-12 lg:items-start xl:gap-12">
          <div className="lg:col-span-6">
            <ProfilePortrait member={member} phase={phase} rect={rect} reduced={reduced} />
          </div>
          <div className="lg:col-span-6">
            <ProfileDetails member={member} phase={phase} reduced={reduced} nameId={nameId} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
