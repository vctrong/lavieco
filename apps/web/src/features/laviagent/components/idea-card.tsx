import Image from "next/image";
import Link from "next/link";
import { FiArrowRight, FiClock, FiPackage, FiUsers } from "react-icons/fi";

import { cn } from "@lavieco/ui";

import { ideaHref } from "../constants/config";
import { TEXT } from "../constants/text";
import type { Difficulty, Idea } from "../types";

const t = TEXT.vi;

export const DIFFICULTY_CLASS: Record<Difficulty, string> = {
  easy: "bg-mint-mist text-emerald-ink",
  medium: "bg-deep-blue/8 text-deep-blue",
  advanced: "bg-deep-blue text-soft-white",
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        DIFFICULTY_CLASS[difficulty],
      )}
    >
      {t.difficulty[difficulty]}
    </span>
  );
}

/** One idea in the results list: the whole card is the link to its guide. */
export function IdeaCard({ idea }: { idea: Idea }) {
  return (
    <Link
      href={ideaHref(idea.id)}
      className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-hairline bg-soft-white shadow-ambient transition-[box-shadow,translate] duration-300 hover:-translate-y-0.5 hover:shadow-ambient-hover"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-[1.75rem] bg-mint-mist">
        <Image
          src={idea.coverImage}
          alt={idea.coverAlt}
          fill
          sizes="(min-width: 1280px) 340px, (min-width: 640px) 45vw, 92vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {idea.kitId ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-soft-white/95 px-2.5 py-1 text-[11px] font-semibold text-deep-blue shadow-ambient">
            <FiPackage aria-hidden="true" size={12} />
            {t.result.kitAvailable}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-charcoal/70">
          <DifficultyBadge difficulty={idea.difficulty} />
          <span className="inline-flex items-center gap-1">
            <FiClock aria-hidden="true" size={12} />
            {t.minutes(idea.durationMinutes)}
          </span>
          <span className="inline-flex items-center gap-1">
            <FiUsers aria-hidden="true" size={12} />
            {t.ageFrom(idea.ageMin)}
          </span>
        </div>
        <h3 className="font-display text-xl leading-snug text-deep-blue">{idea.title}</h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-charcoal/75">{idea.summary}</p>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-sm font-semibold text-emerald-ink">
          {t.result.viewIdea}
          <FiArrowRight
            aria-hidden="true"
            size={15}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </Link>
  );
}

/** Compact card inside a chat answer (`[[idea:<id>]]`). */
export function IdeaChip({ idea }: { idea: Idea }) {
  return (
    <Link
      href={ideaHref(idea.id)}
      className="group flex items-center gap-3 rounded-2xl border border-hairline bg-soft-white p-2 pr-3 transition-colors hover:border-emerald-brand"
    >
      <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-mint-mist">
        <Image
          src={idea.coverImage}
          alt={idea.coverAlt}
          fill
          sizes="56px"
          className="object-cover"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-deep-blue">{idea.title}</span>
        <span className="mt-0.5 block text-xs text-charcoal/65">
          {t.difficulty[idea.difficulty]} · {t.minutes(idea.durationMinutes)}
        </span>
      </span>
      <FiArrowRight aria-hidden="true" size={15} className="shrink-0 text-emerald-ink" />
    </Link>
  );
}
