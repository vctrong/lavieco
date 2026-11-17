import Link from "next/link";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiDownload,
  FiImage,
  FiPlus,
  FiUploadCloud,
} from "react-icons/fi";

import {
  PRODUCT_STATUSES,
  type PartnerBrand,
  type ProductCategory,
  type ProductList,
  type ProductListItem,
} from "@lavieco/shared/shop";
import { Button, ProductFrame, SelectField, TextField, cn } from "@lavieco/ui";

import { MediaImage } from "@/shared/components/media-image";

import { TEXT } from "../constants/text";
import { ShopShell } from "./shop-shell";
import { StatusBadge } from "./status-badge";

const t = TEXT.vi;
const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

export function priceText(min: number, max: number) {
  return min === max ? money.format(min) : `${money.format(min)} – ${money.format(max)}`;
}

function ProductRow({ product, category }: { product: ProductListItem; category: string }) {
  return (
    <li className="border-b border-hairline last:border-b-0">
      <Link
        href={`/shop/products/${product.id}`}
        className="flex items-center gap-4 px-4 py-3.5 hover:bg-mint-mist/50 md:px-5"
      >
        <ProductFrame className="w-16 shrink-0 md:w-20">
          {product.cover ? (
            <MediaImage
              publicId={product.cover.publicId}
              alt={product.cover.alt}
              fill
              sizes="80px"
            />
          ) : (
            <span
              role="img"
              aria-label={t.list.noImage}
              className="flex h-full items-center justify-center text-deep-blue/40"
            >
              <FiImage aria-hidden="true" size={20} />
            </span>
          )}
        </ProductFrame>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-display text-[17px] text-deep-blue">{product.title}</p>
            <StatusBadge status={product.status} />
          </div>
          <p className="mt-0.5 text-[13px] text-charcoal/75">
            {category} · {priceText(product.priceMin, product.priceMax)} ·{" "}
            {t.list.variants(product.variantCount)}
          </p>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px]">
            <span
              className={cn(product.lowStock ? "font-semibold text-error" : "text-charcoal/65")}
            >
              {product.lowStock ? t.list.lowStock : t.list.available(product.available)}
            </span>
            {product.publishBlockers.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-charcoal/75">
                <FiAlertTriangle aria-hidden="true" size={12} className="text-deep-blue" />
                {t.list.missing(product.publishBlockers.length)}
              </span>
            ) : null}
            {product.impactStatus === "pending" ? (
              <span className="text-charcoal/75">{t.list.impactPending}</span>
            ) : null}
          </p>
        </div>
        <FiArrowRight aria-hidden="true" size={16} className="shrink-0 text-deep-blue/50" />
      </Link>
    </li>
  );
}

type Filters = { q?: string; status?: string; categoryId?: string; stock?: string };

/** `/shop/products`: filters are a plain GET form; cards on phones, rows on desktop. */
export function ProductsListPage({
  page,
  filters,
  categories,
}: {
  page: ProductList;
  filters: Filters;
  categories: ProductCategory[];
  brands: PartnerBrand[];
}) {
  const any = { value: "", label: t.list.filters.any };
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const nextParams = new URLSearchParams(
    Object.entries({ ...filters, cursor: page.nextCursor ?? "" }).filter(([, v]) => v) as [
      string,
      string,
    ][],
  );
  const create = (
    <div className="flex flex-wrap gap-2">
      <Button as="a" href="/api/shop/products/export" variant="secondary" size="sm">
        <FiDownload aria-hidden="true" size={14} />
        {t.import.export}
      </Button>
      <Button as={Link} href="/shop/products/import" variant="secondary" size="sm">
        <FiUploadCloud aria-hidden="true" size={14} />
        {t.import.open}
      </Button>
      <Button as={Link} href="/shop/products/new" size="sm">
        <FiPlus aria-hidden="true" size={15} />
        {t.list.create}
      </Button>
    </div>
  );
  return (
    <ShopShell section="products" title={t.list.title} intro={t.list.intro} actions={create}>
      <form
        method="get"
        action="/shop/products"
        aria-label={t.list.filters.label}
        className="mb-6 grid gap-4 rounded-3xl border border-hairline bg-white p-5 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto]"
      >
        <TextField tone="light" label={t.list.filters.q} name="q" defaultValue={filters.q ?? ""} />
        <SelectField
          tone="light"
          label={t.list.filters.status}
          name="status"
          defaultValue={filters.status ?? ""}
          options={[any, ...PRODUCT_STATUSES.map((value) => ({ value, label: t.status[value] }))]}
        />
        <SelectField
          tone="light"
          label={t.list.filters.category}
          name="categoryId"
          defaultValue={filters.categoryId ?? ""}
          options={[any, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
        />
        <SelectField
          tone="light"
          label={t.list.filters.stock}
          name="stock"
          defaultValue={filters.stock ?? ""}
          options={[
            any,
            { value: "low", label: t.list.stockFilter.low },
            { value: "out", label: t.list.stockFilter.out },
          ]}
        />
        <div className="flex items-end">
          <Button type="submit" variant="deep" size="sm" className="h-10.5 w-full px-5 md:w-auto">
            {t.list.filters.apply}
          </Button>
        </div>
      </form>
      <section className="overflow-hidden rounded-3xl border border-hairline bg-white shadow-ambient">
        {page.items.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-[14px] text-charcoal/70">{t.list.empty}</p>
            <Button
              as={Link}
              href="/shop/products/new"
              variant="secondary"
              size="sm"
              className="mt-4"
            >
              {t.list.emptyAction}
            </Button>
          </div>
        ) : (
          <ul>
            {page.items.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                category={categoryName.get(product.categoryId) ?? ""}
              />
            ))}
          </ul>
        )}
      </section>
      {page.nextCursor ? (
        <div className="mt-5 flex justify-end">
          <Link
            href={`/shop/products?${nextParams.toString()}`}
            className="flex min-h-11 items-center gap-1.5 rounded-full border border-hairline px-4 py-2 text-[12.5px] text-deep-blue hover:bg-mint-mist"
          >
            {t.list.next}
            <FiArrowRight aria-hidden="true" size={13} />
          </Link>
        </div>
      ) : null}
    </ShopShell>
  );
}
