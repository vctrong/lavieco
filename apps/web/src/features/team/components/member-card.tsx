"use client";

import Image from "next/image";
import { useRef } from "react";

import { PearlDot, cn } from "@lavieco/ui";

import {
  CUTOUT_BLEED_PX,
  CUTOUT_HEIGHT_PERCENT,
  TEAM_BACKDROP_BG,
  TEAM_CARD_STYLES,
} from "../constants/config";
import { getFullName, getPhotoAlt } from "../constants/members";
import { TEXT } from "../constants/text";
import type { TeamMember } from "../types";
import { Backdrop } from "./illustrations/backdrops";
import type { Rect } from "./profile-portrait";

type MemberCardProps = {
  member: TeamMember;
  index: number;
  /** True while this member's profile is open: the arch is hidden so it is not doubled. */
  active: boolean;
  onOpen: (member: TeamMember, trigger: HTMLElement, getOrigin: () => Rect) => void;
};

/**
 * Portrait arch card. The cutout rises above the arch (head and shoulders break its
 * outline) while the lower body stays inside. The arch is a button that opens the
 * storyteller's profile. All hover reactions are CSS, driven by the `group` class.
 */
export function MemberCard({ member, index, active, onOpen }: MemberCardProps) {
  const t = TEXT.vi;
  const style = TEAM_CARD_STYLES[index] ?? TEAM_CARD_STYLES[0];
  const name = getFullName(member);
  const scale = member.photoScale ?? 1;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const archRef = useRef<HTMLDivElement>(null);

  const measure = (): Rect => {
    const box = archRef.current?.getBoundingClientRect();
    return box
      ? { left: box.left, top: box.top, width: box.width, height: box.height }
      : { left: 0, top: 0, width: 0, height: 0 };
  };

  return (
    <li className={cn("group relative flex flex-col pt-16", style.card)}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`${t.openAriaPrefix} ${name}`}
        onClick={() => buttonRef.current && onOpen(member, buttonRef.current, measure)}
        className="block w-full rounded-t-full text-left focus-visible:outline-offset-4"
      >
        <div
          ref={archRef}
          style={{ visibility: active ? "hidden" : "visible" }}
          className={cn("relative w-full", style.arch)}
        >
          {/* 1 · Arch base: gradient and backdrop art. The only layer that clips. */}
          <div
            className={cn(
              "absolute inset-0 overflow-hidden rounded-t-full",
              TEAM_BACKDROP_BG[member.backdrop],
            )}
          >
            <Backdrop name={member.backdrop} />
          </div>

          {/* Ripple behind the figure, only while hovering. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-t-full border border-emerald-brand/40 opacity-0 motion-safe:group-hover:animate-cutout-ripple"
          />

          {/* 2 · Hairline and mat-board, over the base but under the figure. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-t-full border border-hairline transition-colors duration-300 group-hover:border-emerald-brand/40"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-2 rounded-t-full border border-mint-mist/70"
          />

          {/* 3–4 · Figure. Clip trims only the bottom, so the head and shoulders spill out. */}
          <div className="pointer-events-none absolute inset-0 [clip-path:inset(-60%_-25%_0_-25%)]">
            <div
              style={{
                height: `calc(${CUTOUT_HEIGHT_PERCENT * scale}% + ${CUTOUT_BLEED_PX}px)`,
                bottom: -CUTOUT_BLEED_PX,
                translate: member.photoOffsetY ? `0 ${member.photoOffsetY}%` : undefined,
              }}
              className={cn(
                "absolute inset-x-0 flex origin-bottom justify-center drop-shadow-cutout transition-[transform,filter] duration-500 ease-out",
                "motion-safe:group-hover:-translate-y-2 motion-safe:group-hover:scale-[1.04] group-hover:drop-shadow-cutout-hover",
                style.tilt,
              )}
            >
              <Image
                src={member.photo.src}
                width={member.photo.width}
                height={member.photo.height}
                alt={getPhotoAlt(member)}
                sizes="(min-width: 768px) 30vw, 80vw"
                className="h-full w-auto max-w-none"
              />
            </div>
          </div>

          <PearlDot
            size="lg"
            tone="canary"
            className="absolute left-[62%] top-0 -translate-y-3 scale-75 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100"
          />
          <span className="absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-deep-blue/90 px-3 py-1 text-[11px] font-medium text-soft-white opacity-0 shadow-md transition-opacity duration-300 group-focus-within:opacity-100 group-hover:opacity-100">
            {t.openPill}
          </span>
        </div>
      </button>

      <div className="mt-3 border-t border-hairline pb-1 pt-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] font-semibold text-deep-blue/80 transition-colors duration-300 group-hover:text-deep-blue">
            {t.profile.catalogueNumber} {member.no} · {name}
          </span>
          <PearlDot
            size="sm"
            tone="emerald-flat"
            className="motion-safe:group-hover:animate-pulse"
          />
        </div>
        <p className="mb-1 font-mono text-[10px] uppercase tracking-museum text-emerald-brand">
          {member.roleShort}
        </p>
        <div className="overflow-hidden">
          <p className="max-h-0 text-xs leading-relaxed text-charcoal/70 opacity-0 transition-all duration-300 ease-out group-focus-within:max-h-20 group-focus-within:opacity-100 group-hover:max-h-20 group-hover:opacity-100 [@media(hover:none)]:max-h-20 [@media(hover:none)]:opacity-100">
            {member.summary}
          </p>
        </div>
      </div>
    </li>
  );
}
