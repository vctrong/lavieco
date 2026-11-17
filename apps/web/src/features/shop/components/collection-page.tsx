import Link from "next/link";
import { FiArrowRight, FiBookOpen } from "react-icons/fi";

import {
  PUBLIC_PRODUCT_SORTS,
  type PublicCategory,
  type PublicProductList,
  type PublicProductSort,
} from "@lavieco/shared/shop";
import { Button, Container, Eyebrow, cn } from "@lavieco/ui";

import { TEXT } from "../constants/text";
import type { CollectionFilters } from "../server/catalog";
import { ProductCard } from "./product-card";
import { SortMenu } from "./sort-menu";

const t = TEXT.vi.collection;

const href = (filters: Partial<CollectionFilters>) => {
  const params = new URLSearchParams();
  if (filters.category) params.set("danh_muc", filters.category);
  if (filters.sort && filters.sort !== "featured") params.set("sap_xep", filters.sort);
  if (filters.cursor) params.set("trang", filters.cursor);
  const query = params.toString();
  return query ? `/bo-suu-tap?${query}` : "/bo-suu-tap";
};

/**
 * `/bo-suu-tap` (UC-35): story first, then the products as evidence (BR-01). Filters are
 * links, so the page works without JavaScript and every filtered view has its own URL.
 */
export function CollectionPage({
  result,
  categories,
  filters,
}: {
  result: { status: "ok"; page: PublicProductList } | { status: "error" };
  categories: PublicCategory[];
  filters: CollectionFilters;
}) {
  const chip = (active: boolean) =>
    cn(
      "flex min-h-11 items-center rounded-full px-4 text-[14px] transition-colors motion-reduce:transition-none",
      active
        ? "bg-deep-blue font-semibold text-soft-white"
        : "border border-hairline bg-white text-deep-blue hover:border-emerald-brand hover:bg-mint-mist",
    );
  const sortHrefs = Object.fromEntries(
    PUBLIC_PRODUCT_SORTS.map((sort) => [sort, href({ category: filters.category, sort })]),
  ) as Record<PublicProductSort, string>;
  const shown = result.status === "ok" ? result.page.items.length : 0;
  const more = result.status === "ok" && result.page.nextCursor !== null;
  return (
    <Container className="py-12 md:py-16">
      <header className="mb-8 max-w-2xl">
        <Eyebrow>{t.eyebrow}</Eyebrow>
        <h1 className="mt-3 font-display text-4xl text-deep-blue md:text-5xl">{t.title}</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-charcoal/80">{t.intro}</p>
      </header>

      {/* Categories wrap onto more lines instead of scrolling sideways; sort is one menu. */}
      <div className="mb-8 space-y-4 border-b border-hairline pb-5">
        <nav aria-label={t.filters}>
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link
                href={href({ sort: filters.sort })}
                aria-current={!filters.category ? "page" : undefined}
                className={chip(!filters.category)}
              >
                {t.all}
              </Link>
            </li>
            {categories.map((category) => (
              <li key={category.key}>
                <Link
                  href={href({ category: category.key, sort: filters.sort })}
                  aria-current={filters.category === category.key ? "page" : undefined}
                  className={chip(filters.category === category.key)}
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" className="text-[14px] text-charcoal/70">
            {result.status === "ok" ? t.count(shown, more) : null}
          </p>
          <SortMenu current={filters.sort} hrefOf={sortHrefs} />
        </div>
      </div>

      {result.status === "error" ? (
        <p
          role="alert"
          className="rounded-pedestal border border-hairline bg-white p-10 text-center text-charcoal/75"
        >
          {t.error}
        </p>
      ) : result.page.items.length === 0 ? (
        <div className="rounded-pedestal border border-hairline bg-white p-10 text-center">
          <p className="text-charcoal/75">{t.empty}</p>
          <p className="mt-1 text-[14px] text-charcoal/60">{t.emptyHint}</p>
          <Button as={Link} href="/cam-nang" variant="secondary" size="sm" className="mt-5">
            <FiBookOpen aria-hidden="true" size={15} />
            {t.handbook}
          </Button>
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
            {result.page.items.map((product, index) => (
              <li key={product.slug}>
                <ProductCard product={product} priority={index < 4} />
              </li>
            ))}
          </ul>
          {result.page.nextCursor ? (
            <div className="mt-10 flex justify-center">
              <Button
                as={Link}
                href={href({ ...filters, cursor: result.page.nextCursor })}
                variant="secondary"
              >
                {t.more}
                <FiArrowRight aria-hidden="true" size={15} />
              </Button>
            </div>
          ) : null}
        </>
      )}
    </Container>
  );
}
