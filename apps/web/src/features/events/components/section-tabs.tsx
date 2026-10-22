"use client";

import { useEffect, useState } from "react";

import { cn } from "@lavieco/ui";

import { SECTION_ANCHORS, type DetailSection } from "../constants/config";
import { TEXT } from "../constants/text";

/**
 * Sticky anchor tabs of the event page, only for sections that have content. Plain
 * links without JavaScript; with it, the tab of the section being read is marked.
 */
export function SectionTabs({ sections }: { sections: DetailSection[] }) {
  const t = TEXT.vi.detail;
  const [current, setCurrent] = useState<DetailSection | null>(sections[0] ?? null);

  useEffect(() => {
    const targets = sections
      .map((section) => document.getElementById(SECTION_ANCHORS[section]))
      .filter((element): element is HTMLElement => element !== null);
    if (targets.length === 0 || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!visible) return;
        const section = sections.find((name) => SECTION_ANCHORS[name] === visible.target.id);
        if (section) setCurrent(section);
      },
      // The band just under the sticky navigation and tabs.
      { rootMargin: "-160px 0px -60% 0px" },
    );
    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length < 2) return null;
  return (
    <nav
      aria-label={t.tabsLabel}
      className="sticky top-24 z-20 -mx-1 mb-10 overflow-x-auto rounded-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border border-hairline bg-white/95 p-1 shadow-ambient backdrop-blur"
    >
      <ul className="flex w-max gap-1">
        {sections.map((section) => (
          <li key={section}>
            <a
              href={`#${SECTION_ANCHORS[section]}`}
              aria-current={current === section ? "location" : undefined}
              className={cn(
                "block rounded-full px-4 py-1.5 text-body-sm transition-colors motion-reduce:transition-none",
                current === section
                  ? "bg-emerald-brand font-semibold text-charcoal"
                  : "text-charcoal/75 hover:bg-mint-mist hover:text-deep-blue",
              )}
            >
              {t.sections[section]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
