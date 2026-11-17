"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { FiCheck, FiChevronDown } from "react-icons/fi";

import { PUBLIC_PRODUCT_SORTS, type PublicProductSort } from "@lavieco/shared/shop";

import { TEXT } from "../constants/text";

const t = TEXT.vi.collection;

/**
 * "Sắp xếp: Nổi bật ▾": one compact control instead of a row of pills. A `<details>`
 * menu of links, so it still works before JavaScript loads; once loaded it closes on a
 * choice, on a click outside and on Escape.
 */
export function SortMenu({
  current,
  hrefOf,
}: {
  current: PublicProductSort;
  hrefOf: Record<PublicProductSort, string>;
}) {
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = (event: Event) => {
      const node = menu.current;
      if (!node?.open) return;
      if (
        event instanceof KeyboardEvent
          ? event.key === "Escape"
          : !node.contains(event.target as Node)
      ) {
        node.open = false;
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  return (
    <details ref={menu} className="group relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-hairline bg-white px-4 text-[14px] text-deep-blue hover:border-emerald-brand [&::-webkit-details-marker]:hidden">
        <span className="text-charcoal/65">{t.sort}:</span>
        <span className="font-semibold">{t.sorts[current]}</span>
        <FiChevronDown
          aria-hidden="true"
          className="transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <ul className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-hairline bg-white py-1 shadow-lg">
        {PUBLIC_PRODUCT_SORTS.map((sort) => (
          <li key={sort}>
            <Link
              href={hrefOf[sort]}
              aria-current={sort === current ? "true" : undefined}
              onClick={() => {
                if (menu.current) menu.current.open = false;
              }}
              className="flex min-h-11 items-center justify-between px-4 text-[14px] text-deep-blue hover:bg-mint-mist"
            >
              {t.sorts[sort]}
              {sort === current ? (
                <FiCheck aria-hidden="true" className="text-emerald-ink" />
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
