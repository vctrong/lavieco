"use client";

import Image from "next/image";
import { useRef, type CSSProperties } from "react";

import { PearlDot, cn } from "@lavieco/ui";

import { SPARKLES, SPARKLE_COLORS } from "../constants/sparkles";

import {
  CUTOUT_BLEED_PX,
  CUTOUT_HEIGHT_PERCENT,
  TEAM_ARCH_CLASS,
  TEAM_BACKDROP_BG,
  TEAM_CARD_STYLES,
  TEAM_HEADLIGHT_CLASS,
  TEAM_HEADROOM_CLASS,
  TEAM_HOVER_TIMING,
  TEAM_LAYER_DELAY,
  TEAM_NEON,
} from "../constants/config";
import { getFullName, getPhotoAlt } from "../constants/members";
import { TEXT } from "../constants/text";
import type { TeamMember, ZoomRect, ZoomSource } from "../types";
import { Backdrop } from "./illustrations/backdrops";
import { Sparkle } from "./illustrations/sparkle";

type MemberCardProps = {
  member: TeamMember;
  index: number;
  /** True while this person's profile is open: the figure is hidden so it is not seen twice. */
  active: boolean;
  onOpen: (member: TeamMember, trigger: HTMLElement, getSource: () => ZoomSource | null) => void;
};

/**
 * Portrait arch card. The cutout rises above the arch (head and shoulders break its
 * outline) while the lower body stays inside.
 *
 * The whole card is one `<button>` that opens the storyteller's profile, and that
 * button is also the `group`: it never moves, so the hover hit area cannot flicker.
 * Only its inner layers animate, all by CSS (transform and opacity, never layout).
 */
export function MemberCard({ member, index, active, onOpen }: MemberCardProps) {
  const t = TEXT.vi;
  const style = TEAM_CARD_STYLES[index] ?? TEAM_CARD_STYLES[0];
  const neon = TEAM_NEON[style.tone];
  const name = getFullName(member);
  const scale = member.photoScale ?? 1;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const archRef = useRef<HTMLSpanElement>(null);

  // Where the zoom starts and ends: the figure as it is drawn right now, and the arch.
  const getSource = (): ZoomSource | null => {
    const figure = buttonRef.current?.querySelector("img");
    const arch = archRef.current;
    if (!figure || !arch) return null;
    const rectOf = (element: Element): ZoomRect => {
      const box = element.getBoundingClientRect();
      return { left: box.left, top: box.top, width: box.width, height: box.height };
    };
    return { figure: rectOf(figure), arch: rectOf(arch) };
  };

  return (
    <li className={cn("relative", style.card)}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`${t.openAriaPrefix} ${name}`}
        onClick={() => buttonRef.current && onOpen(member, buttonRef.current, getSource)}
        data-cursor="view"
        className={cn("group relative block w-full text-left outline-none", TEAM_HEADROOM_CLASS)}
      >
        <span ref={archRef} className={cn("relative block", TEAM_ARCH_CLASS)}>
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
            {style.tone === "dark" ? (
              <span
                aria-hidden="true"
                className={cn("absolute inset-0 block", TEAM_HEADLIGHT_CLASS)}
              />
            ) : null}
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
           * Sparkles radiate from behind the figure (this layer is under it, so a star
           * never covers a face or body). The layer fades in and out; each star runs
           * its loop only while hovered (paused otherwise), so leaving the card fades
           * them out instead of cutting them off. Hover-capable devices only.
           */}
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 block opacity-0 transition-opacity motion-reduce:hidden",
              "duration-[900ms] ease-in-out group-hover:opacity-100 group-hover:duration-[600ms] group-focus-visible:opacity-100 group-focus-visible:duration-[600ms]",
            )}
          >
            {SPARKLES.map((star, index) => {
              const rad = (star.angle * Math.PI) / 180;
              const colors = SPARKLE_COLORS[style.sparkle];
              return (
                <span
                  key={star.angle}
                  className="absolute block"
                  style={{
                    left: `${(50 + Math.cos(rad) * star.radius * 100).toFixed(2)}%`,
                    top: `${(50 + Math.sin(rad) * star.radius * 100).toFixed(2)}%`,
                    width: `${star.size}px`,
                    height: `${star.size}px`,
                    marginLeft: `${-star.size / 2}px`,
                    marginTop: `${-star.size / 2}px`,
                  }}
                >
                  <Sparkle
                    className={cn(
                      "animate-sparkle-radiate [animation-play-state:paused] group-hover:[animation-play-state:running] group-focus-visible:[animation-play-state:running]",
                      colors[index % 2],
                    )}
                    style={
                      {
                        "--sx": `${Math.round(Math.cos(rad) * star.travel)}px`,
                        "--sy": `${Math.round(Math.sin(rad) * star.travel)}px`,
                        "--srot": `${star.turn}deg`,
                        "--sdur": `${star.duration}s`,
                        "--sdelay": `${star.delay}s`,
                      } as CSSProperties
                    }
                  />
                </span>
              );
            })}
          </span>

          {/*
           * 3 · Figure. The window is a plain rectangle with `overflow: hidden` that
           * extends 25% beyond the arch on each side and 60% above it, so it trims only
           * the bottom (rectangular clip: no mask, cheap to animate). Inside it, a box
           * mirrors the arch so the percentages below are relative to the arch.
           */}
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute -inset-x-1/4 -top-3/5 bottom-0 block overflow-hidden",
              active && "invisible",
            )}
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
                  src={member.portraitList.src}
                  width={member.portraitList.width}
                  height={member.portraitList.height}
                  alt={getPhotoAlt(member)}
                  sizes="(min-width: 768px) 30vw, 80vw"
                  draggable={false}
                  className="h-full w-auto max-w-none drop-shadow-cutout"
                />
              </span>
            </span>
          </span>

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
          {/* Fixed three-line slot: fades in, never changes the card's height (no layout shift). */}
          <span
            className={cn(
              "line-clamp-3 block h-[2.9rem] text-[11px] leading-snug text-charcoal/70 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100",
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
