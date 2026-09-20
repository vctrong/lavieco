"use client";

import Image from "next/image";
import { useRef } from "react";

import { PearlDot, cn } from "@lavieco/ui";

import { TEAM_CARD_STYLES } from "../constants/config";
import { getFullName } from "../constants/members";
import { TEXT } from "../constants/text";
import type { TeamMember } from "../types";
import type { Rect } from "./profile-portrait";

type MemberCardProps = {
  member: TeamMember;
  index: number;
  /** True while this member's profile is open: the grid photo is hidden so it is not doubled. */
  active: boolean;
  onOpen: (member: TeamMember, trigger: HTMLElement, getOrigin: () => Rect) => void;
};

const preloaded = new Set<string>();

/** Warms the browser cache so the sticker does not pop in when the profile opens. */
function preload(src: string) {
  if (preloaded.has(src)) return;
  preloaded.add(src);
  const image = new window.Image();
  image.src = src;
}

/** Portrait arch card. The photo is a button that opens the storyteller's profile. */
export function MemberCard({ member, index, active, onOpen }: MemberCardProps) {
  const t = TEXT.vi;
  const style = TEAM_CARD_STYLES[index] ?? TEAM_CARD_STYLES[0];
  const name = getFullName(member);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);

  const measure = (): Rect => {
    const box = photoRef.current?.getBoundingClientRect();
    return box
      ? { left: box.left, top: box.top, width: box.width, height: box.height }
      : { left: 0, top: 0, width: 0, height: 0 };
  };

  const handleWarm = () => {
    if (member.sticker) preload(member.sticker.src);
  };

  return (
    <li
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-t-full rounded-b-2xl border border-hairline bg-soft-white p-4 transition-all duration-300 hover:-translate-y-2 hover:border-emerald-brand hover:shadow-xl focus-within:-translate-y-2 focus-within:border-emerald-brand",
        style.card,
      )}
    >
      <button
        ref={buttonRef}
        type="button"
        data-cursor="view"
        aria-label={`${t.openAriaPrefix} ${name}`}
        onClick={() => buttonRef.current && onOpen(member, buttonRef.current, measure)}
        onPointerEnter={handleWarm}
        onFocus={handleWarm}
        className="block w-full rounded-t-full rounded-b-xl text-left focus-visible:outline-offset-4"
      >
        <div
          ref={photoRef}
          style={{ visibility: active ? "hidden" : "visible" }}
          className={cn(
            "relative w-full overflow-hidden rounded-t-full bg-gradient-to-b from-mint-mist to-emerald-brand/25 ring-0 ring-emerald-brand/60 transition-shadow duration-300 group-hover:ring-2",
            style.photo,
          )}
        >
          <Image
            src={member.photo.src}
            width={member.photo.width}
            height={member.photo.height}
            alt={`${t.photoAltPrefix} ${name}`}
            sizes="(min-width: 768px) 33vw, 100vw"
            className="size-full object-cover object-[50%_20%] transition-transform duration-500 group-hover:scale-105"
          />
          <PearlDot
            size="lg"
            tone="canary"
            className="absolute right-4 top-4 scale-75 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100"
          />
          <span className="absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-deep-blue/90 px-3 py-1 text-[11px] font-medium text-soft-white opacity-0 shadow-md transition-opacity duration-300 group-focus-within:opacity-100 group-hover:opacity-100">
            {t.openPill}
          </span>
        </div>
      </button>

      <div className="border-t border-hairline pb-1 pt-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] font-semibold text-deep-blue">
            {t.profile.catalogueNumber} {member.no} · {name}
          </span>
          <PearlDot size="sm" tone="emerald-flat" />
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
