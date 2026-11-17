"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FiBookOpen,
  FiCheck,
  FiCheckCircle,
  FiCopy,
  FiExternalLink,
  FiPackage,
} from "react-icons/fi";

import type { ShopOrderLookup, ShopOrderPublic } from "@lavieco/shared/shop";
import { Button, Container, FormAlert, ProductFrame, TextField, cn } from "@lavieco/ui";

import { callAction } from "@/shared/call-action";
import { MEDIA_DELIVERY_READY, MediaImage } from "@/shared/components/media-image";
import { OtpInput } from "@/shared/components/otp-input";
import { useCountdown } from "@/shared/hooks/use-countdown";

import {
  cancelShopOrder,
  confirmOrderLookup,
  refreshShopOrder,
  startOrderLookup,
} from "../actions/checkout";
import { TEXT } from "../constants/text";
import { formatMoney } from "../utils/format";

const tp = TEXT.vi.payment;
const to = TEXT.vi.order;
const POLL_MS = 3_000;

function Copy({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 border-b border-hairline py-2.5 last:border-b-0">
      <span className="text-[13px] text-charcoal/65">{label}</span>
      <span className="flex items-center gap-1 font-semibold text-charcoal">
        {value}
        <button
          type="button"
          aria-label={`${tp.copy} ${label}`}
          onClick={() => void navigator.clipboard.writeText(value).then(() => setCopied(true))}
          className="grid size-11 place-items-center rounded-full text-deep-blue hover:bg-mint-mist"
        >
          {copied ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />}
        </button>
      </span>
    </div>
  );
}

/**
 * `/thanh-toan/[token]`: VietQR on the LAVIECO page, polling every 3 s. Payment is only
 * ever confirmed by payOS (webhook or API, BR-15); this page just shows the result.
 */
export function ShopPaymentPage({
  token,
  initial,
  qrImage,
}: {
  token: string;
  initial: ShopOrderPublic;
  qrImage: string | null;
}) {
  const router = useRouter();
  const [order, setOrder] = useState(initial);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const left = useCountdown(
    order.status === "awaiting_payment" ? (order.payment?.expiresAt ?? order.expiresAt) : null,
  );

  useEffect(() => {
    if (order.status !== "awaiting_payment") {
      router.replace(`/don-hang/${token}?moi=1`);
      return;
    }
    const timer = setInterval(async () => {
      const result = await refreshShopOrder(token).catch(() => null);
      if (result?.status === "ok") setOrder(result.data);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [order.status, router, token]);

  const cancel = async () => {
    const result = await callAction(() => cancelShopOrder(token));
    if (result.status === "ok") setOrder(result.data);
    else setAlert(TEXT.vi.checkout.failures[result.reason]);
  };

  const payment = order.payment;
  const minutes =
    left === null ? null : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  return (
    <Container className="py-10 md:py-14">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-[12px] font-semibold uppercase tracking-museum text-deep-blue/60">
            {to.code(order.publicCode)}
          </p>
          <h1 className="mt-2 font-display text-3xl text-deep-blue md:text-4xl">{tp.title}</h1>
        </header>
        <FormAlert tone="error" message={alert} />
        {payment ? (
          <div className="grid gap-6 rounded-pedestal border border-hairline bg-white p-5 md:grid-cols-[280px_minmax(0,1fr)] md:p-6">
            <div className="space-y-3 text-center">
              {qrImage ? (
                <Image
                  src={qrImage}
                  alt={tp.qrAlt}
                  width={280}
                  height={280}
                  unoptimized
                  className="mx-auto rounded-2xl border border-hairline"
                />
              ) : null}
              <p role="status" className="text-[13px] font-semibold text-deep-blue">
                {left !== null && left > 0 ? `${tp.hold} ${minutes}` : tp.expired}
              </p>
            </div>
            <div className="space-y-3">
              <p className="text-[14.5px] text-charcoal/80">{tp.scan}</p>
              <div>
                <Copy label={tp.amount} value={formatMoney(order.amount)} />
                <Copy label={tp.account} value={payment.accountNumber} />
                <Copy label={tp.accountName} value={payment.accountName} />
                <Copy label={tp.content} value={payment.description} />
              </div>
              <p
                className="flex items-center gap-2 text-[13px] text-charcoal/70"
                aria-live="polite"
              >
                <FiPackage aria-hidden="true" className="motion-safe:animate-pulse" />
                {tp.waiting}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  as="a"
                  href={payment.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="secondary"
                  size="sm"
                >
                  <FiExternalLink aria-hidden="true" size={14} />
                  {tp.openPayos}
                </Button>
                {confirmCancel ? (
                  <>
                    <Button type="button" variant="deep" size="sm" onClick={cancel}>
                      {tp.cancelYes}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setConfirmCancel(false)}
                    >
                      {tp.cancelNo}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => setConfirmCancel(true)}
                  >
                    {tp.cancel}
                  </Button>
                )}
              </div>
              {confirmCancel ? (
                <p className="text-[13px] text-charcoal/75">{tp.cancelConfirm}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </Container>
  );
}

/** `/don-hang/[token]`: status, items, delivery, history; the story note on every order (BR-01). */
export function ShopOrderPage({
  token,
  order,
  fresh,
}: {
  token: string;
  order: ShopOrderPublic;
  fresh: boolean;
}) {
  const done = order.status !== "cancelled" && order.status !== "expired";
  return (
    <Container className="py-10 md:py-14">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          {fresh && done ? (
            <p className="inline-flex items-center gap-2 rounded-full bg-mint-mist px-3 py-1 text-[13px] font-semibold text-emerald-ink">
              <FiCheckCircle aria-hidden="true" /> {to.thanks}
            </p>
          ) : null}
          <h1 className="font-display text-3xl text-deep-blue md:text-4xl">
            {to.code(order.publicCode)}
          </h1>
          <p
            className={cn(
              "text-[15px] font-semibold",
              done ? "text-deep-blue" : "text-charcoal/70",
            )}
          >
            {to.statuses[order.status]}
          </p>
          {order.status === "awaiting_payment" ? (
            <Button as={Link} href={`/thanh-toan/${token}`}>
              {to.pay}
            </Button>
          ) : null}
          {order.paymentMethod === "cod" && !order.paidAt && done ? (
            <p className="text-[14px] text-charcoal/80">{to.codNote}</p>
          ) : null}
          {order.tracking ? (
            <p className="text-[14px] text-charcoal/80">
              {to.tracking(order.tracking.carrier, order.tracking.code)}
            </p>
          ) : null}
        </header>

        <section className="rounded-pedestal border border-hairline bg-white p-5">
          <h2 className="mb-3 font-display text-xl text-deep-blue">{to.items}</h2>
          <ul className="space-y-3">
            {order.items.map((item) => (
              <li key={item.variantId} className="flex gap-3">
                <ProductFrame className="w-16 shrink-0">
                  {item.image && MEDIA_DELIVERY_READY ? (
                    <MediaImage
                      publicId={item.image.publicId}
                      alt={item.image.alt}
                      fill
                      sizes="64px"
                    />
                  ) : null}
                </ProductFrame>
                <div className="min-w-0 flex-1 text-[14.5px]">
                  <Link
                    href={`/bo-suu-tap/${item.productSlug}`}
                    className="font-semibold text-deep-blue hover:text-emerald-ink"
                  >
                    {item.title}
                  </Link>
                  <p className="text-charcoal/65">
                    {[item.optionLabel, `× ${item.quantity}`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <p className="font-semibold">{formatMoney(item.lineTotal)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1.5 border-t border-hairline pt-3 text-[14.5px]">
            <div className="flex justify-between">
              <dt>{TEXT.vi.checkout.subtotal}</dt>
              <dd>{formatMoney(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{TEXT.vi.checkout.shipping}</dt>
              <dd>{formatMoney(order.shippingFee)}</dd>
            </div>
            {order.discount ? (
              <div className="flex justify-between text-emerald-ink">
                <dt>{TEXT.vi.checkout.discount}</dt>
                <dd>−{formatMoney(order.discount.amount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between text-[17px] font-semibold">
              <dt>{TEXT.vi.checkout.total}</dt>
              <dd>{formatMoney(order.amount)}</dd>
            </div>
          </dl>
        </section>

        <section className="grid gap-4 rounded-pedestal border border-hairline bg-white p-5 md:grid-cols-2">
          <div>
            <p className="text-[13px] font-semibold text-deep-blue">
              {order.shippingMethod === "pickup" ? to.pickupAt : to.deliverTo}
            </p>
            <p className="text-[14.5px] text-charcoal/85">{order.addressText}</p>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-deep-blue">{to.buyer}</p>
            <p className="text-[14.5px] text-charcoal/85">
              {order.buyerName} · {order.phoneMasked} · {order.emailMasked}
            </p>
          </div>
        </section>

        <section className="rounded-pedestal bg-mint-mist p-5">
          <p className="text-[14.5px] text-deep-blue">{to.storyNote}</p>
          <Button as={Link} href="/cam-nang" variant="deep" size="sm" className="mt-3">
            <FiBookOpen aria-hidden="true" size={14} />
            {to.handbook}
          </Button>
          {order.returnDays > 0 ? (
            <p className="mt-3 text-[13px] text-charcoal/75">
              {TEXT.vi.checkout.returns(order.returnDays)}
            </p>
          ) : null}
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg text-deep-blue">{to.history}</h2>
          <ol className="space-y-1 text-[13.5px] text-charcoal/80">
            {order.statusHistory.map((entry, index) => (
              <li key={index}>
                {new Date(entry.at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} ·{" "}
                {to.statuses[entry.status]}
              </li>
            ))}
          </ol>
        </section>
        <div className="flex flex-wrap gap-3 text-[14px]">
          <Link href="/dang-ky" className="min-h-11 font-semibold leading-[44px] text-emerald-ink">
            {to.account}
          </Link>
          <Link href="/tra-cuu-don" className="min-h-11 leading-[44px] text-deep-blue">
            {to.lookup}
          </Link>
        </div>
      </div>
    </Container>
  );
}

function OrderList({ items }: { items: ShopOrderLookup["items"] }) {
  const tl = TEXT.vi.lookup;
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.accessToken}
          className="flex flex-wrap items-center justify-between gap-3 rounded-pedestal border border-hairline bg-white p-4"
        >
          <div>
            <p className="font-semibold text-deep-blue">{item.publicCode}</p>
            <p className="text-[13.5px] text-charcoal/70">
              {to.statuses[item.status]} · {tl.items(item.itemCount)} · {formatMoney(item.amount)}
            </p>
          </div>
          <Button as={Link} href={`/don-hang/${item.accessToken}`} variant="secondary" size="sm">
            {tl.open}
          </Button>
        </li>
      ))}
    </ul>
  );
}

/** `/tra-cuu-don`: email → 6-digit code → the orders of that email. */
export function OrderLookupPage() {
  const tl = TEXT.vi.lookup;
  const [email, setEmail] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [items, setItems] = useState<ShopOrderLookup["items"] | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    setAlert(null);
    const result = await callAction(() => startOrderLookup(email));
    setBusy(false);
    if (result.status === "ok") setChallengeId(result.data.challengeId);
    else setAlert(TEXT.vi.checkout.failures[result.reason]);
  };
  const confirm = async () => {
    if (!challengeId) return;
    setBusy(true);
    const result = await callAction(() => confirmOrderLookup({ challengeId, code }));
    setBusy(false);
    if (result.status === "ok") setItems(result.data);
    else setAlert(TEXT.vi.checkout.failures[result.reason]);
  };

  return (
    <Container className="py-10 md:py-14">
      <div className="mx-auto max-w-xl space-y-5">
        <h1 className="font-display text-4xl text-deep-blue">{tl.title}</h1>
        <p className="text-charcoal/80">{tl.intro}</p>
        <FormAlert tone="error" message={alert} />
        {items ? (
          items.length === 0 ? (
            <p className="text-charcoal/75">{tl.none}</p>
          ) : (
            <OrderList items={items} />
          )
        ) : !challengeId ? (
          <div className="space-y-3 rounded-pedestal border border-hairline bg-white p-5">
            <TextField
              tone="light"
              type="email"
              label={tl.email}
              value={email}
              disabled={busy}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="button" disabled={busy || !email} onClick={send}>
              {tl.send}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 rounded-pedestal border border-hairline bg-white p-5">
            <p className="text-[14px] text-charcoal/80">{TEXT.vi.checkout.codeSent(email)}</p>
            <OtpInput value={code} onChange={setCode} disabled={busy} invalid={false} />
            <Button type="button" disabled={busy || code.length !== 6} onClick={confirm}>
              {tl.confirm}
            </Button>
          </div>
        )}
      </div>
    </Container>
  );
}

/** "Đơn hàng của tôi" in the member area. */
export function MyOrdersSection({ items }: { items: ShopOrderLookup["items"] | null }) {
  const ta = TEXT.vi.account;
  return (
    <section className="space-y-4">
      <h2 className="font-display text-2xl text-deep-blue">{ta.title}</h2>
      {items === null ? (
        <p className="text-charcoal/75">{ta.signIn}</p>
      ) : items.length === 0 ? (
        <p className="text-charcoal/75">{ta.empty}</p>
      ) : (
        <OrderList items={items} />
      )}
    </section>
  );
}
