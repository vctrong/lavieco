import Link from "next/link";
import { FiArrowUpRight, FiFeather } from "react-icons/fi";

import type { PublicProductCard } from "@lavieco/shared/shop";
import { ProductFrame, cn } from "@lavieco/ui";

import { MEDIA_DELIVERY_READY, MediaImage } from "@/shared/components/media-image";

import { TEXT } from "../constants/text";
import { formatMoney, priceRangeText } from "../utils/format";

const t = TEXT.vi.collection;

/** Half-circle cut into the card edge, so the price reads like the stub of a ticket. */
function Notch({ side }: { side: "left" | "right" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute top-0 size-4 -translate-y-1/2 rounded-full border border-hairline bg-soft-white",
        side === "left" ? "-left-2" : "-right-2",
      )}
    />
  );
}

/**
 * One product of the collection, drawn as an exhibition ticket: the image sits in a mat
 * inside a bordered card, a perforated line separates the story label from the price
 * stub. Square image, never the arch (docs/08 §6.1).
 */
export function ProductCard({
  product,
  priority = false,
}: {
  product: PublicProductCard;
  priority?: boolean;
}) {
  const out = product.availability === "out";
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-pedestal border border-hairline bg-white",
        "transition-[transform,border-color,box-shadow] motion-safe:duration-300",
        "hover:border-emerald-brand/60 hover:shadow-[0_18px_40px_-24px] hover:shadow-deep-blue/40",
        "motion-safe:hover:-translate-y-1 focus-within:border-emerald-brand",
      )}
    >
      <div className="p-2 pb-0">
        <ProductFrame className="rounded-[calc(var(--radius-pedestal)-0.4rem)]">
          {product.cover && MEDIA_DELIVERY_READY ? (
            <MediaImage
              publicId={product.cover.publicId}
              alt={product.cover.alt}
              fill
              sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
              preload={priority}
              className={cn(
                "motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-[1.04]",
                out && "grayscale-[60%]",
              )}
            />
          ) : (
            <span className="flex h-full flex-col items-center justify-center gap-2 text-deep-blue/35">
              <FiFeather aria-hidden="true" size={26} />
              <span className="text-[11px] font-semibold uppercase tracking-museum">
                {t.noImage}
              </span>
            </span>
          )}
          <span className="absolute left-2 top-2 flex flex-wrap gap-1.5">
            {out ? (
              <span className="rounded-full bg-charcoal/85 px-2.5 py-1 text-[11px] font-semibold text-soft-white">
                {t.soldOut}
              </span>
            ) : product.compareAtMax ? (
              <span className="rounded-full bg-canary px-2.5 py-1 text-[11px] font-semibold text-charcoal">
                {t.sale}
              </span>
            ) : null}
            {product.availability === "low" ? (
              <span className="rounded-full bg-soft-white/95 px-2.5 py-1 text-[11px] font-semibold text-deep-blue">
                {t.low}
              </span>
            ) : product.availability === "made_to_order" ? (
              <span className="rounded-full bg-soft-white/95 px-2.5 py-1 text-[11px] font-semibold text-deep-blue">
                {t.madeToOrder}
              </span>
            ) : null}
          </span>
        </ProductFrame>
      </div>

      <div className="flex flex-1 flex-col gap-1 px-3.5 pb-3.5 pt-3 sm:px-4">
        <p className="truncate text-[11px] font-semibold uppercase tracking-museum text-emerald-ink">
          {product.brand ? t.partner(product.brand.name) : product.category.name}
        </p>
        <h3 className="font-display text-[17px] leading-snug text-deep-blue sm:text-[18px]">
          <Link
            href={`/bo-suu-tap/${product.slug}`}
            className="after:absolute after:inset-0 after:rounded-pedestal focus-visible:outline-none group-hover:text-emerald-ink"
          >
            {product.title}
          </Link>
        </h3>
      </div>

      {/* The stub: perforation, then price and an arrow that fills on hover. */}
      <div className="relative mx-0 border-t border-dashed border-hairline px-3.5 py-3 sm:px-4">
        <Notch side="left" />
        <Notch side="right" />
        <div className="flex items-center justify-between gap-2">
          <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-[14.5px]">
            <span className={cn("font-semibold", out ? "text-charcoal/55" : "text-charcoal")}>
              {product.priceMin === product.priceMax
                ? formatMoney(product.priceMin)
                : t.from(formatMoney(product.priceMin))}
            </span>
            {product.compareAtMax ? (
              <span className="text-[12.5px] text-charcoal/55 line-through">
                {formatMoney(product.compareAtMax)}
              </span>
            ) : null}
            <span className="sr-only">{priceRangeText(product.priceMin, product.priceMax)}</span>
          </p>
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-full border border-hairline text-deep-blue transition-colors group-hover:border-emerald-brand group-hover:bg-emerald-brand group-hover:text-charcoal motion-reduce:transition-none"
          >
            <FiArrowUpRight size={15} />
          </span>
        </div>
      </div>
    </article>
  );
}
