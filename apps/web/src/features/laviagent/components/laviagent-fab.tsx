"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiCamera } from "react-icons/fi";

import { FAB_HIDDEN_PREFIXES, FAB_HIDDEN_SUFFIXES, LAVIAGENT_HREF } from "../constants/config";
import { TEXT } from "../constants/text";

const t = TEXT.vi.fab;

const hiddenOn = (pathname: string) =>
  FAB_HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix)) ||
  FAB_HIDDEN_SUFFIXES.some((suffix) => pathname.endsWith(suffix));

/**
 * "Hỏi LaviAgent", bottom right on every site page except LaviAgent itself and pages
 * whose primary action sits at the bottom (checkout, tickets, sign-in). A round button
 * on phones, a pill from `md`; kept clear of the home indicator.
 */
export function LaviAgentFab() {
  const pathname = usePathname();
  if (hiddenOn(pathname)) return null;

  return (
    <Link
      href={LAVIAGENT_HREF}
      aria-label={t.short}
      className="group fixed bottom-[max(1rem,calc(env(safe-area-inset-bottom)+0.5rem))] right-4 z-30 rounded-full p-[2px] shadow-float-dock agent-ring animate-agent-shimmer transition-shadow hover:shadow-neon-emerald print:hidden md:bottom-6 md:right-6"
    >
      <span className="relative flex size-14 items-center justify-center gap-2 rounded-full bg-emerald-brand text-charcoal md:size-auto md:py-3 md:pl-4 md:pr-5">
        <FiCamera aria-hidden="true" size={22} className="md:size-[18px]" />
        {/* The spark of the mascot, on the camera's shoulder. */}
        <span
          aria-hidden="true"
          className="absolute right-2.5 top-2.5 size-2.5 rotate-45 rounded-[2px] bg-canary shadow-glow-canary md:static md:size-2"
        />
        <span className="hidden whitespace-nowrap text-sm font-bold md:inline">{t.label}</span>
      </span>
    </Link>
  );
}
