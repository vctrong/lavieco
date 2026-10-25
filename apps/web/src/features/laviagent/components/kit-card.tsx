import Image from "next/image";
import Link from "next/link";
import { FiArrowRight, FiCheck, FiHeart, FiPackage } from "react-icons/fi";

import { Button, Eyebrow } from "@lavieco/ui";

import { TEXT } from "../constants/text";
import type { Kit } from "../types";

const t = TEXT.vi;

/** Full KIT card: idea page sidebar and the results page band. */
export function KitCard({ kit }: { kit: Kit }) {
  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-hairline bg-soft-white shadow-ambient">
      <div className="relative aspect-[16/10] bg-mint-mist">
        <Image
          src={kit.image}
          alt={kit.imageAlt}
          fill
          sizes="(min-width: 1024px) 360px, 92vw"
          className="object-cover"
        />
      </div>
      <div className="space-y-4 p-5">
        <div>
          <Eyebrow className="mb-1.5">{t.kit.kicker}</Eyebrow>
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 break-words font-display text-xl leading-snug text-deep-blue">
              {kit.name}
            </h3>
            <p className="shrink-0 font-display text-xl text-emerald-ink">{t.price(kit.price)}</p>
          </div>
          <p className="mt-1 text-sm text-charcoal/75">{kit.summary}</p>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-museum text-charcoal/60">
            {t.kit.contents}
          </p>
          <ul className="space-y-1.5 text-sm text-charcoal/85">
            {kit.contents.map((item) => (
              <li key={item} className="flex gap-2">
                <FiCheck
                  aria-hidden="true"
                  size={15}
                  className="mt-0.5 shrink-0 text-emerald-ink"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <Button as={Link} href={kit.productUrl} className="w-full">
          <FiPackage aria-hidden="true" size={16} />
          {t.kit.view}
        </Button>
        <p className="text-[11px] text-charcoal/55">{t.kit.priceNote}</p>
        <p className="flex gap-2 rounded-2xl bg-mint-mist p-3 text-xs leading-relaxed text-deep-blue">
          <FiHeart aria-hidden="true" size={14} className="mt-0.5 shrink-0 text-emerald-ink" />
          {t.kit.community}
        </p>
      </div>
    </article>
  );
}

/** Compact card inside a chat answer (`[[kit:<id>]]`). */
export function KitChip({ kit }: { kit: Kit }) {
  return (
    <Link
      href={kit.productUrl}
      className="group flex items-center gap-3 rounded-2xl border border-hairline bg-mint-mist/60 p-2 pr-3 transition-colors hover:border-emerald-brand"
    >
      <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-mint-mist">
        <Image src={kit.image} alt={kit.imageAlt} fill sizes="56px" className="object-cover" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-deep-blue">{kit.name}</span>
        <span className="mt-0.5 block text-xs text-emerald-ink">{t.price(kit.price)}</span>
      </span>
      <FiArrowRight aria-hidden="true" size={15} className="shrink-0 text-emerald-ink" />
    </Link>
  );
}
