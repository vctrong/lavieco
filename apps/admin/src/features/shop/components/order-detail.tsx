"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FiArrowLeft, FiDownload, FiPhone, FiPrinter } from "react-icons/fi";

import type { ShopOrderAction, ShopOrderAdmin } from "@lavieco/shared/shop";
import { Button, CheckboxField, ProductFrame, TextField, cn, useToast } from "@lavieco/ui";

import { callAction } from "@/shared/call-action";
import { MediaImage } from "@/shared/components/media-image";

import { actOnShopOrder, refundShopOrder } from "../actions/orders";
import { TEXT } from "../constants/text";
import { failureText } from "../utils/failure";

const t = TEXT.vi.orders;
const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });
const time = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const STYLE: Record<string, string> = {
  paid: "bg-mint-mist text-emerald-ink",
  confirmed: "bg-mint-mist text-emerald-ink",
  delivered: "bg-mint-mist text-emerald-ink",
  completed: "bg-mint-mist text-emerald-ink",
  refunded: "bg-error/10 text-error",
};

/** Actions that need more than a click: a form opens under the button. */
const NEEDS_FORM: ShopOrderAction[] = ["ship", "cancel", "return", "refund"];

/** `/shop/orders/[id]` (UC-40): everything to handle one order from a phone. */
export function OrderDetail({ order }: { order: ShopOrderAdmin }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<ShopOrderAction | null>(null);
  const [carrier, setCarrier] = useState(order.tracking?.carrier ?? "");
  const [code, setCode] = useState(order.tracking?.code ?? "");
  const [restock, setRestock] = useState(true);
  const [note, setNote] = useState("");
  const [totp, setTotp] = useState("");

  const run = async (action: ShopOrderAction) => {
    setBusy(true);
    const body = {
      action,
      revision: order.revision,
      restock,
      note,
      ...(action === "ship" && (carrier || code) ? { tracking: { carrier, code } } : {}),
    };
    const result = await callAction(() =>
      action === "refund" ? refundShopOrder(order.id, body, totp) : actOnShopOrder(order.id, body),
    );
    setBusy(false);
    if (result.status === "ok") {
      toast({ tone: "success", message: t.done });
      setOpen(null);
      setTotp("");
      router.refresh();
    } else toast({ tone: "error", message: failureText(result) });
  };

  const address =
    order.shipping.method === "pickup"
      ? t.pickup
      : [
          order.shipping.address?.line,
          order.shipping.address?.ward,
          order.shipping.address?.province,
        ]
          .filter(Boolean)
          .join(", ");

  return (
    <div className="mx-auto max-w-4xl space-y-5 print:max-w-none">
      <Link
        href="/shop/orders"
        className="inline-flex min-h-11 items-center gap-1.5 text-[13px] text-deep-blue print:hidden"
      >
        <FiArrowLeft aria-hidden="true" size={14} />
        {t.back}
      </Link>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-semibold text-deep-blue md:text-3xl">
          {order.publicCode}
        </h1>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-[12.5px] font-semibold",
            STYLE[order.status] ?? "bg-deep-blue/10 text-deep-blue",
          )}
        >
          {t.statuses[order.status]}
        </span>
        <span className="text-[13px] text-charcoal/65">
          {t.payment[order.paymentMethod]} · {time(order.createdAt)}
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="ml-auto print:hidden"
          onClick={() => window.print()}
        >
          <FiPrinter aria-hidden="true" size={14} />
          {t.print}
        </Button>
      </header>

      {order.flags.refundRequired || order.flags.amountMismatch || order.flags.latePayment ? (
        <p
          role="alert"
          className="rounded-2xl bg-error/10 px-4 py-3 text-[14px] font-semibold text-error"
        >
          {[
            order.flags.refundRequired && t.flags.refundRequired,
            order.flags.amountMismatch && t.flags.amountMismatch,
            order.flags.latePayment && t.flags.latePayment,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}

      <section className="grid gap-4 rounded-3xl border border-hairline bg-white p-5 md:grid-cols-2">
        <div className="space-y-1 text-[14px]">
          <p className="font-semibold text-deep-blue">{t.buyer}</p>
          <p>{order.buyer.fullName}</p>
          <p>{order.buyer.email}</p>
          <a
            href={`tel:${order.buyer.phone}`}
            className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-emerald-ink print:hidden"
          >
            <FiPhone aria-hidden="true" /> {t.call} {order.buyer.phone}
          </a>
        </div>
        <div className="space-y-1 text-[14px]">
          <p className="font-semibold text-deep-blue">{t.recipient}</p>
          <p>
            {order.shipping.recipientName} · {order.shipping.recipientPhone}
          </p>
          <p>
            {t.address}: {address}
          </p>
          {order.shipping.note ? (
            <p>
              {t.note}: {order.shipping.note}
            </p>
          ) : null}
          {order.tracking ? (
            <p className="font-mono">
              {order.tracking.carrier} {order.tracking.code}
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-hairline bg-white p-5">
        <h2 className="mb-3 font-display text-lg text-deep-blue">{t.lines}</h2>
        <ul className="space-y-3">
          {order.items.map((item) => (
            <li key={item.variantId} className="flex items-center gap-3">
              <ProductFrame className="w-14 shrink-0 print:hidden">
                {item.image ? (
                  <MediaImage
                    publicId={item.image.publicId}
                    alt={item.image.alt}
                    fill
                    sizes="56px"
                  />
                ) : null}
              </ProductFrame>
              <div className="min-w-0 flex-1 text-[14px]">
                <p className="font-semibold text-deep-blue">{item.title}</p>
                <p className="text-charcoal/65">
                  {item.optionLabel} · <span className="font-mono">{item.sku}</span>
                </p>
              </div>
              <p className="text-[14px]">{t.qty(item.quantity)}</p>
              <p className="w-24 text-right text-[14px] font-semibold">
                {money.format(item.lineTotal)}
              </p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-hairline pt-3 text-[14px]">
          <div className="flex justify-between">
            <dt>{t.subtotal}</dt>
            <dd>{money.format(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{t.shipping}</dt>
            <dd>{money.format(order.shippingFee)}</dd>
          </div>
          {order.discount ? (
            <div className="flex justify-between">
              <dt>
                {t.discount} ({order.discount.code})
              </dt>
              <dd>−{money.format(order.discount.amount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between text-[16px] font-semibold">
            <dt>{t.total}</dt>
            <dd>{money.format(order.amount)}</dd>
          </div>
        </dl>
      </section>

      {order.allowedActions.length > 0 ? (
        <section className="space-y-3 rounded-3xl border border-hairline bg-white p-5 print:hidden">
          <div className="flex flex-wrap gap-2">
            {order.allowedActions.map((action) => (
              <Button
                key={action}
                type="button"
                size="sm"
                variant={
                  action === "cancel" || action === "refund" || action === "return"
                    ? "secondary"
                    : "primary"
                }
                disabled={busy}
                onClick={() =>
                  NEEDS_FORM.includes(action)
                    ? setOpen(open === action ? null : action)
                    : void run(action)
                }
                className="min-h-11"
              >
                {t.actions[action]}
              </Button>
            ))}
          </div>
          {open ? (
            <div className="space-y-3 rounded-2xl bg-soft-white p-4">
              {open === "ship" ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <TextField
                    tone="light"
                    label={t.carrier}
                    value={carrier}
                    disabled={busy}
                    onChange={(e) => setCarrier(e.target.value)}
                  />
                  <TextField
                    tone="light"
                    label={t.trackingCode}
                    value={code}
                    disabled={busy}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
              ) : null}
              {open === "cancel" || open === "return" ? (
                <CheckboxField
                  tone="light"
                  label={t.restock}
                  checked={restock}
                  disabled={busy}
                  onChange={(e) => setRestock(e.target.checked)}
                />
              ) : null}
              {open === "refund" ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <TextField
                    tone="light"
                    label={t.refundNote}
                    value={note}
                    disabled={busy}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <TextField
                    tone="light"
                    label={t.totp}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={totp}
                    disabled={busy}
                    onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
              ) : null}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="deep"
                  size="sm"
                  disabled={busy || (open === "refund" && totp.length !== 6)}
                  onClick={() => void run(open)}
                >
                  {t.confirmAction}
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(null)}>
                  {t.cancelAction}
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-3xl border border-hairline bg-white p-5">
        <h2 className="mb-2 font-display text-lg text-deep-blue">{t.history}</h2>
        <ol className="space-y-1 text-[13.5px] text-charcoal/80">
          {order.statusHistory.map((entry, index) => (
            <li key={index}>
              {time(entry.at)} · {t.statuses[entry.status]}
            </li>
          ))}
        </ol>
        {order.refundNote ? <p className="mt-2 text-[13.5px]">{order.refundNote}</p> : null}
      </section>
    </div>
  );
}

/** "Xuất Excel" of orders: date range + TOTP (step-up), then the file downloads. */
export function ExportOrdersButton() {
  const toast = useToast();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(
    new Date(),
  );
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(today.slice(0, 8) + "01");
  const [to, setTo] = useState(today);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/shop/orders/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, from, to }),
      });
      if (!response.ok) throw new Error("export");
      const blob = await response.blob();
      const name =
        /filename="([^"]+)"/.exec(response.headers.get("content-disposition") ?? "")?.[1] ??
        "LAVIECO_don-hang.xlsx";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
      setOpen(false);
      setCode("");
    } catch {
      toast({ tone: "error", message: t.export.failed });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <FiDownload aria-hidden="true" size={14} />
        {t.export.open}
      </Button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-[min(90vw,360px)] space-y-3 rounded-3xl border border-hairline bg-white p-4 shadow-lg">
          <p className="font-semibold text-deep-blue">{t.export.title}</p>
          <p className="text-[12.5px] text-charcoal/70">{t.export.hint}</p>
          <div className="grid grid-cols-2 gap-2">
            <TextField
              tone="light"
              type="date"
              label={t.export.from}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <TextField
              tone="light"
              type="date"
              label={t.export.to}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <TextField
            tone="light"
            label={t.totp}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          <Button type="button" size="sm" disabled={busy || code.length !== 6} onClick={download}>
            {t.export.submit}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
