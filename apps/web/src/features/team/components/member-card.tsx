"use client";

import Image from "next/image";
import { useRef } from "react";

import { PearlDot, cn } from "@lavieco/ui";

import {
  CUTOUT_BLEED_PX,
  CUTOUT_HEIGHT_PERCENT,
  TEAM_BACKDROP_BG,
  TEAM_CARD_STYLES,
  TEAM_HOVER_TIMING,
  TEAM_LAYER_DELAY,
  TEAM_NEON,
} from "../constants/config";
import { getFullName, getPhotoAlt } from "../constants/members";
import { TEXT } from "../constants/text";
import type { TeamMember } from "../types";
import { Backdrop } from "./illustrations/backdrops";

type MemberCardProps = {
  member: TeamMember;
  index: number;
  onOpen: (member: TeamMember, trigger: HTMLElement) => void;
};

/**
 * Portrait arch card. The cutout rises above the arch (head and shoulders break its
 * outline) while the lower body stays inside.
 *
 * The whole card is one `<button>` that opens the storyteller's profile, and that
 * button is also the `group`: it never moves, so the hover hit area cannot flicker.
 * Only its inner layers animate, all by CSS (transform and opacity, never layout).
 */
export function MemberCard({ member, index, onOpen }: MemberCardProps) {
  const t = TEXT.vi;
  const style = TEAM_CARD_STYLES[index] ?? TEAM_CARD_STYLES[0];
  const neon = TEAM_NEON[style.tone];
  const name = getFullName(member);
  const scale = member.photoScale ?? 1;
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <li className={cn("relative", style.card)}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`${t.openAriaPrefix} ${name}`}
        onClick={() => buttonRef.current && onOpen(member, buttonRef.current)}
        data-cursor="view"
        className="group relative block w-full pt-16 text-left outline-none"
      >
        <span className={cn("relative block w-full", style.arch)}>
          {/* Lift shadow and neon halo: separate layers that only fade in (nothing on the photo). */}
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 rounded-t-full opacity-0 shadow-ambient-hover transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
              TEAM_HOVER_TIMING,
              TEAM_LAYER_DELAY.rim,
            )}
          />
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 rounded-t-full opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
              neon.halo,
              TEAM_HOVER_TIMING,
              TEAM_LAYER_DELAY.rim,
            )}
          />

          {/* 1 · Arch base: gradient and backdrop art. The only layer that clips. */}
          <span
            className={cn(
              "absolute inset-0 block overflow-hidden rounded-t-full",
              TEAM_BACKDROP_BG[member.backdrop],
            )}
          >
            <Backdrop name={member.backdrop} />
          </span>

          {/* 2 · Hairline and mat-board, over the base but under the figure. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-t-full border border-hairline"
          />
          {/* Neon rim: 1px Emerald edge over the hairline. */}
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 rounded-t-full border opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
              neon.rim,
              TEAM_HOVER_TIMING,
              TEAM_LAYER_DELAY.rim,
            )}
          />
          {/* Keyboard focus: a plain 2px Emerald outline, same as hover but explicit. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-1.5 rounded-t-full border-2 border-emerald-brand opacity-0 group-focus-visible:opacity-100"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-2 rounded-t-full border border-mint-mist/70"
          />

          {/* Soft radial glow right behind the figure, so the person lifts off the backdrop. */}
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute -inset-x-[12%] -top-[22%] bottom-0 block bg-[radial-gradient(ellipse_at_50%_46%,var(--color-neon-glow),transparent_66%)] opacity-0 transition-opacity",
              neon.glowOn,
              TEAM_HOVER_TIMING,
              TEAM_LAYER_DELAY.glow,
            )}
          />

          {/*
           * 3 · Figure. The window is a plain rectangle with `overflow: hidden` that
           * extends 25% beyond the arch on each side and 60% above it, so it trims only
           * the bottom (rectangular clip: no mask, cheap to animate). Inside it, a box
           * mirrors the arch so the percentages below are relative to the arch.
           */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-x-1/4 -top-3/5 bottom-0 block overflow-hidden"
          >
            <span className="absolute inset-x-[16.6667%] bottom-0 top-[37.5%] block">
              <span
                style={{
                  height: `calc(${CUTOUT_HEIGHT_PERCENT * scale}% + ${CUTOUT_BLEED_PX}px)`,
                  bottom: -CUTOUT_BLEED_PX,
                  transform: member.photoOffsetY
                    ? `translateY(${member.photoOffsetY}%)`
                    : undefined,
                }}
                className={cn(
                  "absolute inset-x-0 flex origin-bottom justify-center transition-[translate,scale,rotate] group-hover:will-change-transform",
                  TEAM_HOVER_TIMING,
                  "motion-safe:group-hover:-translate-y-[6px] motion-safe:group-hover:scale-[1.025] motion-safe:group-focus-visible:-translate-y-[6px] motion-safe:group-focus-visible:scale-[1.025]",
                  style.tilt,
                )}
              >
                <Image
                  src={member.photo.src}
                  width={member.photo.width}
                  height={member.photo.height}
                  alt={getPhotoAlt(member)}
                  sizes="(min-width: 768px) 30vw, 80vw"
                  draggable={false}
                  className="h-full w-auto max-w-none drop-shadow-cutout"
                />
              </span>
            </span>
          </span>

          <PearlDot
            size="lg"
            tone="canary"
            className={cn(
              "absolute left-[62%] top-0 -translate-y-3 scale-75 opacity-0 transition-[opacity,scale] group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100",
              TEAM_HOVER_TIMING,
            )}
          />
          <span
            className={cn(
              "absolute inset-x-0 bottom-3 mx-auto block w-fit rounded-full bg-deep-blue/90 px-3 py-1 text-[11px] font-medium text-soft-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
              TEAM_HOVER_TIMING,
            )}
          >
            {t.openPill}
          </span>
        </span>

        <span className="mt-3 block border-t border-hairline pb-1 pt-3">
          <span className="mb-1.5 flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-semibold text-deep-blue/80">
              {t.profile.catalogueNumber} {member.no} · {name}
            </span>
            <span className="relative block">
              <PearlDot size="sm" tone="emerald-flat" />
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-0 rounded-full opacity-0 shadow-glow-emerald transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
                  TEAM_HOVER_TIMING,
                )}
              />
            </span>
          </span>
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-museum text-emerald-brand">
            {member.roleShort}
          </span>
          {/* Fixed two-line slot: fades in, never changes the card's height (no layout shift). */}
          <span
            className={cn(
              "line-clamp-2 block h-9 text-xs leading-relaxed text-charcoal/70 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100",
              TEAM_HOVER_TIMING,
            )}
          >
            {member.summary}
          </span>
        </span>
      </button>
    </li>
  );
}
