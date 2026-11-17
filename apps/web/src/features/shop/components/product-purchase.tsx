"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FiFeather, FiMinus, FiPlus, FiShoppingBag } from "react-icons/fi";

import type { PublicProduct } from "@lavieco/shared/shop";
import { Button, ProductFrame, ToastProvider, cn, useToast } from "@lavieco/ui";

import { callAction } from "@/shared/call-action";
import { MEDIA_DELIVERY_READY, MediaImage } from "@/shared/components/media-image";

import { setCartItem } from "../actions/cart";
import { TEXT } from "../constants/text";
import { formatMoney } from "../utils/format";

const t = TEXT.vi.product;

function Purchase({ product }: { product: PublicProduct }) {
  const toast = useToast();
  const router = useRouter();
  const firstAvailable =
    product.variants.find((v) => v.availability !== "out") ?? product.variants[0];
  const [selected, setSelected] = useState<Record<string, string>>(
    firstAvailable?.optionValues ?? {},
  );
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  const variant =
    product.variants.find((v) =>
      product.options.every((o) => v.optionValues[o.key] === selected[o.key]),
    ) ?? (product.options.length === 0 ? product.variants[0] : undefined);
  const max = variant ? (variant.availability === "out" ? 0 : (variant.left ?? 10)) : 0;

  // Images of the chosen variant first; untagged images always show (docs/08 §6.2).
  const images = useMemo(() => {
    const tags = Object.entries(selected).map(([k, v]) => `${k}:${v}`);
    const own = product.images.filter((i) => i.variantValues.some((v) => tags.includes(v)));
    const general = product.images.filter((i) => i.variantValues.length === 0);
    return own.length + general.length > 0 ? [...own, ...general] : product.images;
  }, [product.images, selected]);
  const shown = images[Math.min(imageIndex, Math.max(0, images.length - 1))];

  const add = async () => {
    if (!variant || max === 0) return;
    setBusy(true);
    const result = await callAction(() => setCartItem(variant.id, quantity, true));
    setBusy(false);
    if (result.status === "ok") {
      toast({
        tone: "success",
        message: t.added,
        action: { label: t.viewCart, onClick: () => router.push("/gio-hang") },
      });
      window.dispatchEvent(new CustomEvent("lv:cart", { detail: result.cart.count }));
    } else {
      toast({ tone: "error", message: TEXT.vi.errors[result.reason] });
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
      <section aria-label={t.gallery} className="space-y-3">
        <ProductFrame ratio="portrait">
          {shown && MEDIA_DELIVERY_READY ? (
            <MediaImage
              publicId={shown.publicId}
              alt={shown.alt}
              fill
              preload
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-deep-blue/40">
              <FiFeather aria-hidden="true" size={36} />
            </span>
          )}
        </ProductFrame>
        {images.length > 1 ? (
          <ul className="grid grid-cols-5 gap-2">
            {images.map((image, index) => (
              <li key={image.mediaId}>
                <button
                  type="button"
                  aria-label={t.thumbnail(index + 1)}
                  aria-pressed={index === imageIndex}
                  onClick={() => setImageIndex(index)}
                  className={cn(
                    "block w-full rounded-pedestal ring-offset-2",
                    index === imageIndex && "ring-2 ring-emerald-ink",
                  )}
                >
                  <ProductFrame>
                    {MEDIA_DELIVERY_READY ? (
                      <MediaImage publicId={image.publicId} alt="" fill sizes="96px" />
                    ) : null}
                  </ProductFrame>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <div className="space-y-6">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-museum text-deep-blue/60">
            {product.brand ? product.brand.name : product.category.name}
          </p>
          <h1 className="mt-2 font-display text-3xl leading-tight text-deep-blue md:text-4xl">
            {product.title}
          </h1>
          {product.summary ? (
            <p className="mt-3 text-[16px] leading-relaxed text-charcoal/80">{product.summary}</p>
          ) : null}
        </div>

        <p className="flex items-baseline gap-3" aria-label={t.price}>
          <span className="font-display text-3xl text-charcoal">
            {formatMoney(variant?.price ?? product.priceMin)}
          </span>
          {variant?.compareAtPrice ? (
            <span className="text-[16px] text-charcoal/55 line-through">
              {formatMoney(variant.compareAtPrice)}
            </span>
          ) : null}
        </p>

        {product.options.map((option) => (
          <fieldset key={option.key}>
            <legend className="mb-2 text-[14px] font-semibold text-deep-blue">
              {t.choose(option.name)}
            </legend>
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const active = selected[option.key] === value.key;
                const exists = product.variants.some(
                  (v) => v.optionValues[option.key] === value.key && v.availability !== "out",
                );
                return (
                  <button
                    key={value.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setSelected((s) => ({ ...s, [option.key]: value.key }));
                      setImageIndex(0);
                      setQuantity(1);
                    }}
                    className={cn(
                      "min-h-11 rounded-full border px-4 text-[14px]",
                      active
                        ? "border-deep-blue bg-deep-blue text-soft-white"
                        : "border-hairline bg-white text-deep-blue hover:border-emerald-brand",
                      !exists && "text-charcoal/45 line-through decoration-charcoal/30",
                    )}
                  >
                    {value.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        {variant?.availability === "low" && variant.left ? (
          <p className="text-[14px] font-semibold text-deep-blue">{t.left(variant.left)}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex items-center rounded-full border border-hairline bg-white"
            role="group"
            aria-label={t.quantity}
          >
            <button
              type="button"
              aria-label={t.decrease}
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="grid size-12 place-items-center rounded-full text-deep-blue disabled:opacity-35"
            >
              <FiMinus aria-hidden="true" />
            </button>
            <output aria-live="polite" className="w-8 text-center text-[16px] font-semibold">
              {quantity}
            </output>
            <button
              type="button"
              aria-label={t.increase}
              disabled={quantity >= max}
              onClick={() => setQuantity((q) => Math.min(max, q + 1))}
              className="grid size-12 place-items-center rounded-full text-deep-blue disabled:opacity-35"
            >
              <FiPlus aria-hidden="true" />
            </button>
          </div>
          <Button
            type="button"
            onClick={add}
            disabled={busy || max === 0}
            className="min-h-12 flex-1 justify-center sm:flex-none"
          >
            <FiShoppingBag aria-hidden="true" size={17} />
            {max === 0 ? t.soldOut : busy ? t.adding : t.add}
          </Button>
        </div>
        <Link
          href="/gio-hang"
          className="inline-flex min-h-11 items-center text-[14px] font-semibold text-emerald-ink underline-offset-4 hover:underline"
        >
          {t.viewCart}
        </Link>
      </div>
    </div>
  );
}

/** Gallery, variant choice and "add to cart" of a product page (client island). */
export function ProductPurchase({ product }: { product: PublicProduct }) {
  return (
    <ToastProvider labels={TEXT.vi.toast}>
      <Purchase product={product} />
    </ToastProvider>
  );
}
