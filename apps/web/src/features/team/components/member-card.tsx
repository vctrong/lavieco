import Image from "next/image";

import { PearlDot, cn } from "@lavieco/ui";

import { TEAM_CARD_STYLES } from "../constants/config";
import { TEXT } from "../constants/text";
import type { TeamMember } from "../types";

type MemberCardProps = {
  member: TeamMember;
  index: number;
};

/** Portrait arch card. The bio is revealed on hover/focus, and always visible on touch. */
export function MemberCard({ member, index }: MemberCardProps) {
  const t = TEXT.vi;
  const style = TEAM_CARD_STYLES[index] ?? TEAM_CARD_STYLES[0];

  return (
    <li
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-t-full rounded-b-2xl border border-hairline bg-soft-white p-4 transition-all duration-300 hover:-translate-y-2 hover:border-emerald-brand hover:shadow-xl focus-within:-translate-y-2 focus-within:border-emerald-brand",
        style.card,
      )}
    >
      <div
        data-cursor="view"
        className={cn(
          "relative w-full overflow-hidden rounded-t-full rounded-b-xl bg-gradient-to-b from-mint-mist to-emerald-brand/25",
          style.photo,
        )}
      >
        <Image
          src={member.photo.src}
          width={member.photo.width}
          height={member.photo.height}
          alt={`${t.photoAltPrefix} ${member.name}`}
          sizes="(min-width: 768px) 33vw, 100vw"
          className="size-full object-cover object-[50%_20%] transition-transform duration-500 group-hover:scale-105"
        />
        <PearlDot
          size="lg"
          tone="canary"
          className="absolute right-4 top-4 scale-75 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100"
        />
      </div>

      <div className="border-t border-hairline pb-1 pt-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] font-semibold text-deep-blue">
            {member.number} · {member.name}
          </span>
          <PearlDot size="sm" tone="emerald-flat" />
        </div>
        <p className="mb-1 font-mono text-[10px] uppercase tracking-museum text-emerald-brand">
          {member.title}
        </p>
        <div className="overflow-hidden">
          <p className="max-h-0 text-xs leading-relaxed text-charcoal/70 opacity-0 transition-all duration-300 ease-out group-focus-within:max-h-20 group-focus-within:opacity-100 group-hover:max-h-20 group-hover:opacity-100 [@media(hover:none)]:max-h-20 [@media(hover:none)]:opacity-100">
            {member.bio}
          </p>
        </div>
      </div>
    </li>
  );
}
