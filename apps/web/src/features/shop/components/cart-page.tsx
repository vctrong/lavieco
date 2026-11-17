"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FiFeather, FiMinus, FiPlus, FiShoppingBag, FiTrash2 } from "react-icons/fi";

import type { Cart, CartLine, PublicShopSettings } from "@lavieco/shared/shop";
import {
  Button,
  Container,
  ProductFrame,
  Skeleton,
  ToastProvider,
  cn,
  useToast,
} from "@lavieco/ui";

import { callAction } from "@/shared/call-action";
import { MEDIA_DELIVERY_READY, MediaImage } from "@/shared/components/media-image";

import { loadCart, setCartItem } from "../actions/cart";
import { TEXT } from "../constants/text";
import { formatMoney } from "../utils/format";

const t = TEXT.vi.cart;

const announce = (count: number) =>
  window.dispatchEvent(new CustomEvent("lv:cart", { detail: count }));

function Line({
  line,
  busy,
  onQuantity,
  onRemove,
}: {
  line: CartLine;
  busy: boolean;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex gap-4 border-b border-hairline py-5 last:border-b-0">
      <Link href={`/bo-suu-tap/${line.productSlug}`} className="w-24 shrink-0 sm:w-28">
        <ProductFrame>
          {line.image && MEDIA_DELIVERY_READY ? (
            <MediaImage publicId={line.image.publicId} alt={line.image.alt} fill sizes="112px" />
          ) : (
            <span className="flex h-full items-center justify-center text-deep-blue/40">
              <FiFeather aria-hidden="true" />
            </span>
          )}
        </ProductFrame>
      </Link>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/bo-suu-tap/${line.productSlug}`}
              className="font-display text-[18px] leading-snug text-deep-blue hover:text-emerald-ink"
            >
              {line.title}
            </Link>
            {line.optionLabel ? (
              <p className="text-[13.5px] text-charcoal/70">{line.optionLabel}</p>
            ) : null}
          </div>
          <p className="text-right">
            <span className="block font-semibold text-charcoal">{formatMoney(line.lineTotal)}</span>
            <span className="text-[12.5px] text-charcoal/60">{formatMoney(line.unitPrice)}</span>
          </p>
        </div>
        {line.issue ? (
          <p className="text-[13px] font-semibold text-error">
            {line.issue === "unavailable" ? t.unavailable : t.reduced(line.maxQuantity)}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          {line.maxQuantity > 0 ? (
            <div
              className="flex items-center rounded-full border border-hairline bg-white"
              role="group"
              aria-label={t.quantity(line.title)}
            >
              <button
                type="button"
                aria-label={TEXT.vi.product.decrease}
                disabled={busy || line.quantity <= 1}
                onClick={() => onQuantity(line.quantity - 1)}
                className="grid size-11 place-items-center rounded-full text-deep-blue disabled:opacity-35"
              >
                <FiMinus aria-hidden="true" />
              </button>
              <output className="w-7 text-center font-semibold">{line.quantity}</output>
              <button
                type="button"
                aria-label={TEXT.vi.product.increase}
                disabled={busy || line.quantity >= line.maxQuantity}
                onClick={() => onQuantity(line.quantity + 1)}
                className="grid size-11 place-items-center rounded-full text-deep-blue disabled:opacity-35"
              >
                <FiPlus aria-hidden="true" />
              </button>
            </div>
          ) : (
            <span />
          )}
          <button
            type="button"
            disabled={busy}
            onClick={onRemove}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[13px] text-charcoal/75 hover:bg-mint-mist"
          >
            <FiTrash2 aria-hidden="true" size={14} />
            {t.remove}
          </button>
        </div>
      </div>
    </li>
  );
}

function CartView({ settings }: { settings: PublicShopSettings | null }) {
  const toast = useToast();
  const [cart, setCart] = useState<Cart | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void callAction(loadCart).then((result) => {
      if (result.status === "ok") {
        setCart(result.cart);
        announce(result.cart.count);
      } else setFailed(true);
    });
  }, []);

  const change = async (variantId: string, quantity: number) => {
    setBusy(true);
    const result = await callAction(() => setCartItem(variantId, quantity));
    setBusy(false);
    if (result.status === "ok") {
      setCart(result.cart);
      announce(result.cart.count);
      return true;
    }
    toast({ tone: "error", message: TEXT.vi.errors[result.reason] });
    return false;
  };

  const remove = async (line: CartLine) => {
    if (await change(line.variantId, 0)) {
      toast({
        tone: "info",
        message: t.removed,
        action: { label: t.undo, onClick: () => void change(line.variantId, line.quantity) },
      });
    }
  };

  if (failed) {
    return (
      <p role="alert" className="rounded-pedestal border border-hairline bg-white p-10 text-center">
        {t.error}
      </p>
    );
  }
  if (!cart) {
    return (
      <div aria-busy="true" aria-label={t.loading} className="space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }
  if (cart.lines.length === 0) {
    return (
      <div className="rounded-pedestal border border-hairline bg-white p-10 text-center">
        <FiShoppingBag aria-hidden="true" size={28} className="mx-auto text-deep-blue/50" />
        <p className="mt-3 text-charcoal/80">{t.empty}</p>
        <Button as={Link} href="/bo-suu-tap" className="mt-5">
          {t.emptyCta}
        </Button>
      </div>
    );
  }

  const buyable = cart.lines.some((line) => line.quantity > 0);
  const free = settings?.freeShippingFrom ?? null;
  const shipping = settings
    ? free !== null && cart.subtotal >= free
      ? 0
      : settings.shippingFee
    : null;
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-pedestal border border-hairline bg-white px-4 sm:px-6">
        <ul>
          {cart.lines.map((line) => (
            <Line
              key={line.variantId}
              line={line}
              busy={busy}
              onQuantity={(q) => void change(line.variantId, q)}
              onRemove={() => void remove(line)}
            />
          ))}
        </ul>
      </section>
      <aside className="space-y-4 rounded-pedestal border border-hairline bg-white p-5 lg:sticky lg:top-28">
        <h2 className="font-display text-xl text-deep-blue">{t.summary}</h2>
        {free !== null ? (
          <div>
            <p className="text-[13.5px] text-charcoal/80">
              {cart.subtotal >= free
                ? t.freeReached
                : t.freeShipping(formatMoney(free - cart.subtotal))}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-mint-mist">
              <div
                className="h-full bg-emerald-brand"
                style={{ width: `${Math.min(100, (cart.subtotal / free) * 100)}%` }}
              />
            </div>
          </div>
        ) : null}
        <dl className="space-y-2 text-[15px]">
          <div className="flex justify-between">
            <dt>{t.subtotal}</dt>
            <dd className="font-semibold">{formatMoney(cart.subtotal)}</dd>
          </div>
          <div className="flex justify-between text-charcoal/75">
            <dt>{t.shipping}</dt>
            <dd>{shipping === null ? t.shippingLater : formatMoney(shipping)}</dd>
          </div>
        </dl>
        <Button
          as={Link}
          href="/dat-hang"
          aria-disabled={!buyable}
          className={cn("w-full justify-center", !buyable && "pointer-events-none opacity-50")}
        >
          {t.checkout}
        </Button>
        <Link
          href="/bo-suu-tap"
          className="block min-h-11 text-center text-[14px] font-semibold leading-[44px] text-emerald-ink"
        >
          {t.continue}
        </Link>
        <p className="text-[12.5px] text-charcoal/65">{t.storyNote}</p>
      </aside>
    </div>
  );
}

/** `/gio-hang` (UC-36): loaded on the client so a member's cart is claimed and merged. */
export function CartPage({ settings }: { settings: PublicShopSettings | null }) {
  return (
    <ToastProvider labels={TEXT.vi.toast}>
      <Container className="py-10 md:py-14">
        <h1 className="mb-8 font-display text-4xl text-deep-blue">{t.title}</h1>
        <CartView settings={settings} />
      </Container>
    </ToastProvider>
  );
}
