"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiArrowRight } from "react-icons/fi";

import { cn } from "@lavieco/ui";

import { LaviAgentMascot } from "@/shared/components/illustrations/laviagent-mascot";

import { LAVIAGENT_HREF } from "../constants/config";
import { TEXT } from "../constants/text";
import { isNavItemActive } from "../utils/is-nav-item-active";

const t = TEXT.vi.laviagent;

/** The AI badge: Canary, the one "pearl" of the pill. */
function AiBadge() {
  return (
    <span className="rounded-full bg-canary px-1.5 py-px text-[10px] font-bold leading-4 text-charcoal">
      {t.badge}
    </span>
  );
}

/**
 * LaviAgent in the bar: a pill with a slowly drifting Emerald → Canary ring, set apart
 * from the plain links and next to the CTA. The ring stops under reduced motion (global
 * rule in theme.css). From 1280px the name shows; below, the mascot and badge only.
 */
export function LaviAgentPill() {
  const active = isNavItemActive(usePathname(), LAVIAGENT_HREF);
  return (
    <Link
      href={LAVIAGENT_HREF}
      aria-label={t.label}
      aria-current={active ? "page" : undefined}
      className="group/agent agent-ring animate-agent-shimmer rounded-full p-[1.5px] transition-shadow duration-300 hover:shadow-neon-emerald-soft"
    >
      <span
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-full pl-1 pr-2 text-[12.5px] font-semibold text-deep-blue transition-colors xl:pr-2.5",
          active ? "bg-mint-mist" : "bg-soft-white group-hover/agent:bg-mint-mist",
        )}
      >
        <LaviAgentMascot className="size-6" />
        <span className="hidden xl:inline">{t.name}</span>
        <AiBadge />
      </span>
    </Link>
  );
}

/** First entry of the mobile drawer, in the same style. */
export function LaviAgentDrawerCard({ onNavigate }: { onNavigate: () => void }) {
  return (
    <Link
      href={LAVIAGENT_HREF}
      onClick={onNavigate}
      className="agent-ring animate-agent-shimmer block rounded-2xl p-[1.5px] shadow-ambient"
    >
      <span className="flex items-center gap-3 rounded-[calc(1rem-1.5px)] bg-soft-white p-3">
        <LaviAgentMascot className="size-11" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 font-display text-xl text-deep-blue">
            {t.drawerTitle}
            <AiBadge />
          </span>
          <span className="block text-xs text-charcoal/70">{t.drawerBody}</span>
        </span>
        <FiArrowRight aria-hidden="true" size={18} className="shrink-0 text-emerald-ink" />
      </span>
    </Link>
  );
}
