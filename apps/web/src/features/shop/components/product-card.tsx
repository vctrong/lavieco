import Link from "next/link";
import { FiFeather } from "react-icons/fi";

import type { PublicProductCard } from "@lavieco/shared/shop";
import { ProductFrame, cn } from "@lavieco/ui";

import { MEDIA_DELIVERY_READY, MediaImage } from "@/shared/components/media-image";

import { TEXT } from "../constants/text";
import { formatMoney, priceRangeText } from "../utils/format";

const t = TEXT.vi.collection;

/** One product of the collection: square image, title, price, availability (no arch). */
export function ProductCard({
  product,
  priority = false,
}: {
  product: PublicProductCard;
  priority?: boolean;
}) {
  const out = product.availability === "out";
  return (
    <article className="group relative flex flex-col gap-3">
      <ProductFrame className="transition-transform motion-safe:duration-500 motion-safe:group-hover:-translate-y-1">
        {product.cover && MEDIA_DELIVERY_READY ? (
          <MediaImage
            publicId={product.cover.publicId}
            alt={product.cover.alt}
            fill
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
            preload={priority}
            className={cn(out && "grayscale-[60%]")}
          />
        ) : (
          <span className="flex h-full items-center justify-center text-deep-blue/40">
            <FiFeather aria-hidden="true" size={28} />
          </span>
        )}
        <span className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
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
          ) : null}
        </span>
      </ProductFrame>
      <div className="space-y-1 px-0.5">
        <p className="text-[11.5px] font-semibold uppercase tracking-museum text-deep-blue/60">
          {product.brand ? t.partner(product.brand.name) : product.category.name}
        </p>
        <h3 className="font-display text-[18px] leading-snug text-deep-blue">
          <Link
            href={`/bo-suu-tap/${product.slug}`}
            className="after:absolute after:inset-0 hover:text-emerald-ink"
          >
            {product.title}
          </Link>
        </h3>
        <p className="flex flex-wrap items-baseline gap-2 text-[14.5px]">
          <span className="font-semibold text-charcoal">
            {product.priceMin === product.priceMax
              ? formatMoney(product.priceMin)
              : t.from(formatMoney(product.priceMin))}
          </span>
          {product.compareAtMax ? (
            <span className="text-[13px] text-charcoal/55 line-through">
              {formatMoney(product.compareAtMax)}
            </span>
          ) : null}
          <span className="sr-only">{priceRangeText(product.priceMin, product.priceMax)}</span>
        </p>
      </div>
    </article>
  );
}
