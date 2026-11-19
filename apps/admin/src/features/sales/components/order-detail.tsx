"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  FiArrowLeft,
  FiCopy,
  FiEdit2,
  FiExternalLink,
  FiPhone,
  FiRotateCcw,
  FiTrash2,
  FiX,
} from "react-icons/fi";

import {
  SALES_ORDER_STATUSES,
  SALES_PAYMENT_STATUSES,
  type SalesOrder,
  type SalesOrderStatus,
  type SalesPaymentStatus,
  type StaffRef,
} from "@lavieco/shared/sales";
import { Button, cn, useToast } from "@lavieco/ui";

import { callAction } from "@/shared/call-action";

import { deleteSalesOrder, quickUpdateSalesOrder, restoreSalesOrder } from "../actions/sales";
import { TEXT } from "../constants/text";
import { failureMessage } from "../utils/failure";
import { money, shortDay } from "../utils/format";
import { DueLabel, PaymentLabel, STATUS_STYLE, StatusPill } from "./pills";

const t = TEXT.vi;

type Change = { status?: SalesOrderStatus; paymentStatus?: SalesPaymentStatus };

/** Phone sheet: big targets, Esc and the backdrop close it, focus starts inside. */
function BottomSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-scrim md:hidden" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="w-full rounded-t-3xl bg-soft-white px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-deep-blue">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-full text-deep-blue hover:bg-mint-mist"
            aria-label={t.detail.cancel}
          >
            <FiX aria-hidden="true" size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-[14px] text-charcoal/65">{label}</dt>
      <dd className="text-right text-[15px] text-charcoal">{children}</dd>
    </div>
  );
}

/**
 * Detail of one order (UC-42): its own page on phones, a panel beside the list from
 * 1200 px. Quick status by bottom sheet (phone) or in-place selects (wider screens).
 */
export function OrderDetail({
  order,
  variant,
  closeHref,
}: {
  order: SalesOrder;
  assignees?: StaffRef[];
  variant: "page" | "panel";
  closeHref: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, startTransition] = useTransition();
  const [sheet, setSheet] = useState<"status" | "payment" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const locked = order.source === "web";
  const deleted = order.deletedAt !== null;

  const change = (input: Change) =>
    startTransition(async () => {
      setSheet(null);
      const result = await callAction(() =>
        quickUpdateSalesOrder(order.id, { revision: order.revision, ...input }),
      );
      if (result.status === "ok") {
        toast({ tone: "success", message: t.detail.saved });
        router.refresh();
      } else toast({ tone: "error", message: failureMessage(result) });
    });

  const restore = (revision: number) =>
    startTransition(async () => {
      const result = await callAction(() => restoreSalesOrder(order.id, revision));
      if (result.status === "ok") {
        toast({ tone: "success", message: t.detail.restored(order.code) });
        router.refresh();
      } else toast({ tone: "error", message: failureMessage(result) });
    });

  const remove = () =>
    startTransition(async () => {
      setConfirming(false);
      const result = await callAction(() => deleteSalesOrder(order.id, order.revision));
      if (result.status !== "ok") {
        toast({ tone: "error", message: failureMessage(result) });
        return;
      }
      const revision = result.data.revision;
      toast({
        tone: "info",
        message: t.detail.removed(order.code),
        action: { label: t.detail.undo, onClick: () => restore(revision) },
      });
      router.push(closeHref);
      router.refresh();
    });

  const copyAddress = async () => {
    if (!order.customer.address) return;
    try {
      await navigator.clipboard.writeText(order.customer.address.full);
      toast({ tone: "success", message: t.detail.copied });
    } catch {
      // Clipboard refused (insecure context): the address stays selectable on screen.
    }
  };

  const select = (
    label: string,
    value: string,
    options: readonly string[],
    text: Record<string, string>,
    onPick: (value: string) => void,
  ) => (
    <label className="flex flex-col gap-1 text-[13px] text-charcoal/65">
      {label}
      <select
        value={value}
        disabled={busy || locked || deleted}
        onChange={(event) => onPick(event.target.value)}
        className="min-h-11 rounded-xl border border-hairline bg-white px-3 text-[15px] text-charcoal focus-visible:outline-2 focus-visible:outline-deep-blue disabled:opacity-60"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {text[option]}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <article className={cn(variant === "page" && "mx-auto max-w-2xl")} aria-busy={busy}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {variant === "page" ? (
            <Link
              href={closeHref}
              className="mb-2 inline-flex min-h-11 items-center gap-1.5 text-[14px] text-deep-blue"
            >
              <FiArrowLeft aria-hidden="true" />
              {t.detail.back}
            </Link>
          ) : null}
          <h2 className="font-mono text-[22px] font-semibold text-deep-blue">{order.code}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-charcoal/65">
            <StatusPill status={order.status} />
            <span>{t.labels.source[order.source]}</span>
            {order.legacyCode ? <span>{t.detail.legacy(order.legacyCode)}</span> : null}
          </p>
        </div>
        {variant === "panel" ? (
          <Link
            href={closeHref}
            scroll={false}
            aria-label={t.detail.close}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-deep-blue hover:bg-mint-mist focus-visible:outline-2 focus-visible:outline-deep-blue"
          >
            <FiX aria-hidden="true" size={20} />
          </Link>
        ) : null}
      </header>

      {deleted ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-charcoal/6 px-4 py-3 text-[14px]">
          {t.detail.deletedBanner}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="min-h-11 gap-1.5 px-4"
            disabled={busy}
            onClick={() => restore(order.revision)}
          >
            <FiRotateCcw aria-hidden="true" />
            {t.detail.restore}
          </Button>
        </div>
      ) : null}
      {locked && order.shopOrderId ? (
        <div className="mb-4 rounded-2xl bg-mint-mist px-4 py-3 text-[14px] text-charcoal">
          <p>{t.detail.webOrder}</p>
          <Link
            href={`/shop/orders/${order.shopOrderId}`}
            className="mt-1 inline-flex min-h-11 items-center gap-1.5 font-semibold text-emerald-ink underline-offset-4 hover:underline"
          >
            {t.detail.openShop}
            <FiExternalLink aria-hidden="true" />
          </Link>
        </div>
      ) : null}

      {!locked && !deleted ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setSheet("status")}
              className={cn(
                "min-h-12 rounded-2xl px-3 text-[15px] font-semibold",
                STATUS_STYLE[order.status],
              )}
            >
              {t.detail.changeStatus}
            </button>
            <button
              type="button"
              onClick={() => setSheet("payment")}
              className="min-h-12 rounded-2xl border border-hairline bg-white px-3 text-[15px] font-semibold text-deep-blue"
            >
              {t.detail.changePayment}
            </button>
          </div>
          <div className="mb-4 hidden grid-cols-2 gap-3 md:grid">
            {select(
              t.detail.changeStatus,
              order.status,
              SALES_ORDER_STATUSES,
              t.labels.status,
              (value) => change({ status: value as SalesOrderStatus }),
            )}
            {select(
              t.detail.changePayment,
              order.paymentStatus,
              SALES_PAYMENT_STATUSES,
              t.labels.payment,
              (value) => change({ paymentStatus: value as SalesPaymentStatus }),
            )}
          </div>
        </>
      ) : null}

      <section className="mb-4 rounded-2xl border border-hairline bg-white p-4">
        <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-charcoal/60">
          {t.detail.customer}
        </h3>
        <p className="text-[17px] font-semibold text-charcoal">{order.customer.name}</p>
        <div className="mt-2 flex flex-col gap-2">
          {order.customer.phone ? (
            <a
              href={`tel:${order.customer.phone.replace(/[^\d+]/g, "")}`}
              className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-hairline px-4 text-[15px] font-medium text-deep-blue hover:bg-mint-mist"
            >
              <FiPhone aria-hidden="true" />
              {order.customer.phone}
              <span className="sr-only">{t.detail.call}</span>
            </a>
          ) : (
            <p className="text-[14px] text-charcoal/55">{t.detail.noPhone}</p>
          )}
          {order.customer.address ? (
            <div className="flex items-start justify-between gap-3">
              <p className="text-[15px] text-charcoal/85 select-text">
                {order.customer.address.full}
              </p>
              <button
                type="button"
                onClick={copyAddress}
                className="flex size-11 shrink-0 items-center justify-center rounded-full text-deep-blue hover:bg-mint-mist"
                aria-label={t.detail.copyAddress}
              >
                <FiCopy aria-hidden="true" />
              </button>
            </div>
          ) : (
            <p className="text-[14px] text-charcoal/55">{t.detail.noAddress}</p>
          )}
        </div>
      </section>

      <section className="mb-4 rounded-2xl border border-hairline bg-white p-4">
        <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-charcoal/60">
          {t.detail.items}
        </h3>
        <ul className="divide-y divide-hairline">
          {order.items.map((item, index) => (
            <li key={index} className="flex items-baseline justify-between gap-3 py-2 text-[15px]">
              <span className="min-w-0">
                {item.name}
                <span className="text-charcoal/60">
                  {" "}
                  {t.detail.line(item.quantity, money(item.unitPrice))}
                </span>
              </span>
              <span className="font-medium whitespace-nowrap">{money(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-2 border-t border-hairline pt-2">
          <Row label={t.detail.subtotal}>{money(order.subtotal)}</Row>
          {order.shippingFee ? (
            <Row label={t.detail.shippingFee}>{money(order.shippingFee)}</Row>
          ) : null}
          {order.discount ? <Row label={t.detail.discount}>−{money(order.discount)}</Row> : null}
          <Row label={t.detail.total}>
            <span className="text-[18px] font-semibold text-deep-blue">{money(order.total)}</span>
          </Row>
        </dl>
      </section>

      <section className="mb-4 rounded-2xl border border-hairline bg-white px-4 py-2">
        <dl className="divide-y divide-hairline">
          <Row label={t.detail.payment}>
            <PaymentLabel status={order.paymentStatus} />
          </Row>
          <Row label={t.detail.method}>
            {order.paymentMethod ? t.labels.method[order.paymentMethod] : t.detail.noMethod}
          </Row>
          <Row label={t.detail.type}>{t.labels.type[order.orderType]}</Row>
          <Row label={t.detail.channel}>{t.labels.channel[order.channel]}</Row>
          <Row label={t.detail.orderDay}>{shortDay(order.orderDay) || "—"}</Row>
          <Row label={t.detail.dueDay}>
            <DueLabel order={order} />
          </Row>
          <Row label={t.detail.assignee}>{order.assignee?.name || t.list.nobody}</Row>
          {order.note ? (
            <div className="py-2">
              <dt className="text-[14px] text-charcoal/65">{t.detail.note}</dt>
              <dd className="mt-1 text-[15px] whitespace-pre-line text-charcoal">{order.note}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <p className="mb-4 space-x-3 text-[12.5px] text-charcoal/55">
        {order.createdBy?.name ? <span>{t.detail.createdBy(order.createdBy.name)}</span> : null}
        {order.updatedBy?.name ? <span>{t.detail.updatedBy(order.updatedBy.name)}</span> : null}
      </p>

      {!deleted ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            as={Link}
            href={`/sales/${order.id}/edit`}
            variant="deep"
            size="sm"
            className="min-h-11 gap-1.5 px-5"
          >
            <FiEdit2 aria-hidden="true" />
            {locked ? t.detail.editTeam : t.detail.edit}
          </Button>
          {!locked ? (
            confirming ? (
              <div
                role="alertdialog"
                aria-label={t.detail.remove}
                className="flex w-full flex-wrap items-center gap-2 rounded-2xl border border-error/30 bg-white p-3"
              >
                <p className="w-full text-[14px] text-charcoal">
                  {t.detail.removeConfirm(order.code)}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="min-h-11 px-4"
                  onClick={() => setConfirming(false)}
                >
                  {t.detail.cancel}
                </Button>
                <button
                  type="button"
                  onClick={remove}
                  disabled={busy}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-error px-4 text-[14px] font-semibold text-soft-white hover:bg-error/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error"
                >
                  <FiTrash2 aria-hidden="true" />
                  {t.detail.removeYes}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium text-error hover:bg-error/8 focus-visible:outline-2 focus-visible:outline-error"
              >
                <FiTrash2 aria-hidden="true" />
                {t.detail.remove}
              </button>
            )
          ) : null}
        </div>
      ) : null}

      {sheet ? (
        <BottomSheet
          title={sheet === "status" ? t.detail.sheetTitle : t.detail.sheetPayment}
          onClose={() => setSheet(null)}
        >
          <ul className="grid gap-2">
            {(sheet === "status" ? SALES_ORDER_STATUSES : SALES_PAYMENT_STATUSES).map((value) => {
              const current =
                sheet === "status" ? order.status === value : order.paymentStatus === value;
              const label =
                sheet === "status"
                  ? t.labels.status[value as SalesOrderStatus]
                  : t.labels.payment[value as SalesPaymentStatus];
              return (
                <li key={value}>
                  <button
                    type="button"
                    aria-pressed={current}
                    disabled={busy}
                    onClick={() =>
                      change(
                        sheet === "status"
                          ? { status: value as SalesOrderStatus }
                          : { paymentStatus: value as SalesPaymentStatus },
                      )
                    }
                    className={cn(
                      "flex min-h-13 w-full items-center rounded-2xl px-4 text-left text-[16px]",
                      current
                        ? "bg-deep-blue font-semibold text-soft-white"
                        : "border border-hairline bg-white text-charcoal",
                    )}
                  >
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        </BottomSheet>
      ) : null}
    </article>
  );
}
