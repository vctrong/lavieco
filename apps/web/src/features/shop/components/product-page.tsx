import Link from "next/link";
import type { ReactNode } from "react";
import { FiArrowLeft, FiArrowRight, FiBookOpen } from "react-icons/fi";

import type { PublicProduct, PublicShopSettings } from "@lavieco/shared/shop";
import { Button, Container } from "@lavieco/ui";

import { JsonLd } from "@/shared/components/json-ld";

import { TEXT } from "../constants/text";
import { formatMoney } from "../utils/format";
import { ProductPurchase } from "./product-purchase";

const t = TEXT.vi.product;

/**
 * `/bo-suu-tap/[slug]` (UC-35). The story card comes right after the purchase block on
 * every screen and links to the Cẩm nang (BR-01, BR-20); impact figures only when
 * approved (BR-23). Delivery and returns are stated before anyone reaches checkout.
 */
export function ProductPage({
  product,
  settings,
  url,
  reviews,
}: {
  product: PublicProduct;
  settings: PublicShopSettings | null;
  url: string;
  /** Published reviews (BR-24), rendered by the page so they can load on their own. */
  reviews?: ReactNode;
}) {
  const facts: { label: string; value: string }[] = [];
  if (product.materials.length > 0)
    facts.push({ label: t.materials, value: product.materials.join(", ") });
  if (product.dimensions) facts.push({ label: t.dimensions, value: product.dimensions });
  if (product.care) facts.push({ label: t.care, value: product.care });

  return (
    <Container className="py-8 md:py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.title,
          description: product.seo.description || product.summary,
          sku: product.variants[0]?.sku ?? product.slug,
          url,
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "VND",
            lowPrice: product.priceMin,
            highPrice: product.priceMax,
            availability:
              product.availability === "out"
                ? "https://schema.org/OutOfStock"
                : "https://schema.org/InStock",
          },
        }}
      />
      <Link
        href="/bo-suu-tap"
        className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-[14px] text-deep-blue hover:text-emerald-ink"
      >
        <FiArrowLeft aria-hidden="true" size={15} />
        {t.back}
      </Link>

      <ProductPurchase product={product} />

      <section aria-labelledby="story" className="mt-14 rounded-pedestal bg-mint-mist p-6 md:p-10">
        <h2 id="story" className="font-display text-2xl text-deep-blue md:text-3xl">
          {t.storyTitle}
        </h2>
        <dl className="mt-6 grid gap-6 md:grid-cols-3">
          {(["message", "story", "lesson"] as const).map((part) =>
            product.story[part] ? (
              <div key={part}>
                <dt className="text-[12px] font-semibold uppercase tracking-museum text-emerald-ink">
                  {t[part]}
                </dt>
                <dd className="mt-2 whitespace-pre-line text-[15.5px] leading-relaxed text-charcoal">
                  {product.story[part]}
                </dd>
              </div>
            ) : null,
          )}
        </dl>
        {product.handbookLink ? (
          <Button
            as={Link}
            href={`/cam-nang/${product.handbookLink.slug}`}
            variant="deep"
            className="mt-8"
          >
            <FiBookOpen aria-hidden="true" size={16} />
            {t.handbookCta}: {product.handbookLink.title}
            <FiArrowRight aria-hidden="true" size={15} />
          </Button>
        ) : null}
      </section>

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        {facts.length > 0 || product.impact.length > 0 ? (
          <section className="space-y-5">
            {facts.length > 0 ? (
              <dl className="space-y-3">
                {facts.map((fact) => (
                  <div key={fact.label}>
                    <dt className="text-[13px] font-semibold text-deep-blue">{fact.label}</dt>
                    <dd className="whitespace-pre-line text-[15px] text-charcoal/85">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {product.impact.length > 0 ? (
              <div>
                <h2 className="font-display text-xl text-deep-blue">{t.impact}</h2>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {product.impact.map((item) => (
                    <li
                      key={item.label}
                      className="rounded-pedestal border border-hairline bg-white p-4"
                    >
                      <p className="font-display text-2xl text-emerald-ink">
                        {item.value} <span className="text-[15px]">{item.unit}</span>
                      </p>
                      <p className="text-[14px] text-charcoal">{item.label}</p>
                      <p className="mt-1 text-[12px] text-charcoal/60">
                        {t.impactSource(item.source)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}
        <section className="space-y-4">
          {product.brand && product.brandStory ? (
            <div>
              <h2 className="font-display text-xl text-deep-blue">
                {t.brand}: {product.brand.name}
              </h2>
              <p className="mt-2 whitespace-pre-line text-[15px] text-charcoal/85">
                {product.brandStory}
              </p>
            </div>
          ) : null}
          {settings ? (
            <div className="rounded-pedestal border border-hairline bg-white p-5">
              <h2 className="font-display text-xl text-deep-blue">{t.policyTitle}</h2>
              <ul className="mt-3 space-y-2 text-[14.5px] text-charcoal/85">
                <li>{t.policy.shipping(formatMoney(settings.shippingFee))}</li>
                {settings.freeShippingFrom !== null ? (
                  <li>{t.policy.free(formatMoney(settings.freeShippingFrom))}</li>
                ) : null}
                {settings.pickup.enabled && settings.pickup.address ? (
                  <li>{t.policy.pickup(settings.pickup.address)}</li>
                ) : null}
                {settings.cod.enabled ? (
                  <li>{t.policy.cod(formatMoney(settings.cod.maxAmount))}</li>
                ) : null}
                {settings.returnDays > 0 ? <li>{t.policy.returns(settings.returnDays)}</li> : null}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
      {reviews}
    </Container>
  );
}
