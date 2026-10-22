"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  FiAlertCircle,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiCopy,
  FiExternalLink,
  FiXCircle,
} from "react-icons/fi";

import { orderViewSchema, type OrderView } from "@lavieco/shared/events";
import { Button, FormAlert } from "@lavieco/ui";

import { callAction } from "@/shared/call-action";
import { useCountdown } from "@/shared/hooks/use-countdown";

import { cancelOrder, reconcileOrder } from "../actions/order";
import { CHECKOUT_ROUTES, PAYMENT_POLL_MS, PAYMENT_RECONCILE_EVERY } from "../constants/config";
import { TEXT } from "../constants/text";
import { formatCountdown, formatVnd } from "../utils/format";
import { messageFor } from "./messages";

type PaymentPanelProps = {
  token: string;
  initial: OrderView;
  qrImage: string | null;
  /** Back from payOS (`returnUrl`): ask payOS once through the service, display only. */
  reconcileOnLoad: boolean;
  /** Back from payOS through `cancelUrl`: offer to cancel and free the seats. */
  askCancel: boolean;
};

function CopyRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const t = TEXT.vi.payment;
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 border-b border-hairline py-3 last:border-b-0">
      <span className="text-[13px] text-charcoal/65">{label}</span>
      <span className="flex items-center gap-2 text-right">
        <span
          className={
            strong ? "font-display text-xl text-deep-blue" : "font-semibold text-deep-blue"
          }
        >
          {value}
        </span>
        <button
          type="button"
          aria-label={t.copy(label)}
          onClick={() => {
            void navigator.clipboard?.writeText(value).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="rounded-full p-1.5 text-deep-blue/60 hover:bg-mint-mist hover:text-deep-blue"
        >
          {copied ? (
            <FiCheck aria-hidden="true" size={14} />
          ) : (
            <FiCopy aria-hidden="true" size={14} />
          )}
        </button>
      </span>
    </div>
  );
}

/**
 * VietQR shown on the LAVIECO page, payOS checkout as a fallback, polling every 3 s
 * until the service reports a change (docs/05 §5.1). The payment itself is confirmed
 * by the verified webhook or payOS's own answer, never by this page (BR-15).
 */
export function PaymentPanel({
  token,
  initial,
  qrImage,
  reconcileOnLoad,
  askCancel,
}: PaymentPanelProps) {
  const t = TEXT.vi.payment;
  const router = useRouter();
  const [order, setOrder] = useState(initial);
  const [checking, setChecking] = useState(reconcileOnLoad && initial.status === "pending");
  const [confirmCancel, setConfirmCancel] = useState(askCancel);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const deadline = order.payment?.expiresAt ?? order.expiresAt;
  const left = useCountdown(order.status === "pending" ? deadline : null);

  useEffect(() => {
    if (!reconcileOnLoad || initial.status !== "pending") return;
    let active = true;
    void reconcileOrder(token).then((result) => {
      if (!active) return;
      setChecking(false);
      if (result.status === "ok") setOrder(result.order);
    });
    return () => {
      active = false;
    };
  }, [reconcileOnLoad, initial.status, token]);

  useEffect(() => {
    if (order.status !== "pending") return;
    let tick = 0;
    const timer = setInterval(async () => {
      tick += 1;
      if (tick % PAYMENT_RECONCILE_EVERY === 0) {
        // The webhook may be late or lost: ask payOS itself now and then.
        const result = await reconcileOrder(token).catch(() => null);
        if (result?.status === "ok") setOrder(result.order);
        return;
      }
      try {
        const response = await fetch(CHECKOUT_ROUTES.orderStatusApi(token), { cache: "no-store" });
        if (!response.ok) return;
        const parsed = orderViewSchema.safeParse(await response.json());
        if (parsed.success) setOrder(parsed.data);
      } catch {
        // Offline for a moment: the next tick tries again.
      }
    }, PAYMENT_POLL_MS);
    return () => clearInterval(timer);
  }, [order.status, token]);

  useEffect(() => {
    if (order.status === "paid" && order.tickets.length > 0) {
      router.replace(`${CHECKOUT_ROUTES.ticket(token)}?moi=1`);
    }
  }, [order.status, order.tickets.length, router, token]);

  // The long QR panel gives way to a short result: keep it in view (the buyer may have
  // scrolled down to the cancel button) and move focus there.
  const settledRef = useRef<HTMLDivElement>(null);
  const wasPending = useRef(initial.status === "pending");
  useEffect(() => {
    if (!wasPending.current || order.status === "pending") return;
    wasPending.current = false;
    settledRef.current?.scrollIntoView({ block: "start" });
    settledRef.current?.focus({ preventScroll: true });
  }, [order.status]);

  const handleCancel = async () => {
    setBusy(true);
    setAlert(null);
    const result = await callAction(() => cancelOrder(token));
    setBusy(false);
    setConfirmCancel(false);
    if (result.status === "ok") setOrder(result.order);
    else if (result.status === "error") setAlert(messageFor(result));
  };

  if (order.status !== "pending") {
    const paid = order.status === "paid";
    const message = paid
      ? order.refundRequired
        ? t.refundRequired
        : t.paid
      : order.status === "cancelled"
        ? t.cancelled
        : t.expired;
    const Icon =
      paid && !order.refundRequired
        ? FiCheckCircle
        : order.status === "cancelled"
          ? FiXCircle
          : FiAlertCircle;
    return (
      <div
        ref={settledRef}
        tabIndex={-1}
        className="scroll-mt-24 space-y-5 rounded-3xl border border-hairline bg-white p-6 outline-none md:p-8"
      >
        <p role="status" className="flex items-start gap-3 text-[15px] text-deep-blue">
          <Icon aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-emerald-brand" />
          {message}
        </p>
        <div className="flex flex-wrap gap-3">
          {paid && order.tickets.length > 0 ? (
            <Button as={Link} href={CHECKOUT_ROUTES.ticket(token)}>
              {t.viewTickets}
            </Button>
          ) : null}
          <Button as={Link} href={CHECKOUT_ROUTES.event(order.event.slug)} variant="secondary">
            {t.backToEvent}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-3xl border border-hairline bg-white p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          role="status"
          className="flex items-center gap-2 text-[14px] font-semibold text-deep-blue"
        >
          <span
            aria-hidden="true"
            className="size-2.5 animate-pulse rounded-full bg-emerald-brand motion-reduce:animate-none"
          />
          {checking ? t.checking : t.waiting}
        </p>
        <p className="inline-flex items-center gap-2 rounded-full bg-mint-mist px-4 py-1.5 text-[13px] text-deep-blue">
          <FiClock aria-hidden="true" size={14} />
          {t.expiresIn}
          <strong className="font-display text-lg tabular-nums">
            {left === null ? t.countdownPending : formatCountdown(left)}
          </strong>
        </p>
      </div>

      {qrImage ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-mint-mist/50 p-6">
          <Image
            src={qrImage}
            alt={t.qrAlt}
            width={280}
            height={280}
            unoptimized
            className="rounded-2xl bg-white p-3"
          />
          <p className="max-w-sm text-center text-[13px] leading-relaxed text-charcoal/70">
            {t.scanHint}
          </p>
        </div>
      ) : null}

      {order.payment ? (
        <div>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[12px] font-semibold uppercase tracking-museum text-deep-blue/70">
              {t.manualTitle}
            </h2>
            <span className="text-[12px] text-charcoal/55">{t.manualHint}</span>
          </div>
          <div className="rounded-2xl border border-hairline px-4">
            <CopyRow label={t.accountName} value={order.payment.accountName} />
            <CopyRow label={t.accountNumber} value={order.payment.accountNumber} />
            <CopyRow label={t.bankBin} value={order.payment.bin} />
            <CopyRow label={t.amount} value={formatVnd(order.amount)} strong />
            <CopyRow label={t.description} value={order.payment.description} />
          </div>
          <a
            href={order.payment.checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-deep-blue underline-offset-4 hover:underline"
          >
            {t.openPayos}
            <FiExternalLink aria-hidden="true" size={13} />
          </a>
        </div>
      ) : null}

      <FormAlert tone="error" message={alert} />

      <div className="border-t border-hairline pt-4">
        {confirmCancel ? (
          <div className="flex flex-wrap items-center gap-3 text-[13px]">
            <span className="text-deep-blue">{t.cancelConfirm}</span>
            <Button type="button" size="sm" variant="deep" disabled={busy} onClick={handleCancel}>
              {t.cancelYes}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setConfirmCancel(false)}
            >
              {t.cancelNo}
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-charcoal/65 hover:text-deep-blue"
          >
            <FiXCircle aria-hidden="true" size={14} />
            {t.cancel}
          </button>
        )}
      </div>
    </div>
  );
}
