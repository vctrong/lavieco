import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FiAlertCircle, FiExternalLink, FiInfo } from "react-icons/fi";

import { Button } from "@lavieco/ui";

import { turnstileSiteKey } from "@/lib/turnstile";

import { CHECKOUT_ROUTES } from "../constants/config";
import { TEXT } from "../constants/text";
import { getCheckoutEvent, getOrder, verifiedMember } from "../server/orders";
import { qrDataUrl } from "../server/qr";
import { formatDateTime } from "../utils/format";
import { CheckoutForm } from "./checkout-form";
import { CheckoutShell } from "./checkout-shell";
import { LookupFlow } from "./lookup-flow";
import { OrderSummary } from "./order-summary";
import { PaymentPanel } from "./payment-panel";

/** `/chuong-trinh/[slug]/dang-ky`: the checkout of one published event. */
export async function CheckoutPage({ slug }: { slug: string }) {
  const event = await getCheckoutEvent(slug);
  if (!event || event.kind !== "standard") notFound();
  const t = TEXT.vi;
  const back = { href: CHECKOUT_ROUTES.event(event.slug), label: t.checkout.back };
  if (!event.registration.open) {
    return (
      <CheckoutShell eyebrow={t.checkout.eyebrow} title={event.title} step={null} back={back}>
        <p className="flex max-w-xl items-start gap-3 rounded-3xl border border-hairline bg-white p-6 text-[15px] text-deep-blue">
          <FiInfo aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-emerald-brand" />
          {event.registration.blocker ? t.blockers[event.registration.blocker] : t.checkout.closed}
        </p>
      </CheckoutShell>
    );
  }
  return (
    <CheckoutShell eyebrow={t.checkout.eyebrow} title={event.title} step={1} back={back}>
      <CheckoutForm
        event={event}
        member={await verifiedMember()}
        turnstileSiteKey={turnstileSiteKey()}
      />
    </CheckoutShell>
  );
}

/** `/chuong-trinh/thanh-toan/[token]`: VietQR of a pending order, or its outcome. */
export async function PaymentPage({
  token,
  returned,
  cancelled,
}: {
  token: string;
  returned: boolean;
  cancelled: boolean;
}) {
  const order = await getOrder(token);
  if (!order) notFound();
  const t = TEXT.vi.payment;
  const qrImage =
    order.status === "pending" && order.payment ? await qrDataUrl(order.payment.qrCode, 560) : null;
  return (
    <CheckoutShell eyebrow={t.eyebrow} title={t.title} step={2}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <PaymentPanel
          token={token}
          initial={order}
          qrImage={qrImage}
          reconcileOnLoad={returned}
          askCancel={cancelled && order.status === "pending"}
        />
        <OrderSummary order={order} />
      </div>
    </CheckoutShell>
  );
}

/** `/ve/[token]`: the tickets of a paid order, each with its QR (rendered, not stored). */
export async function TicketPage({ token, justBooked }: { token: string; justBooked: boolean }) {
  const order = await getOrder(token);
  if (!order) notFound();
  const t = TEXT.vi.ticket;
  const tickets = await Promise.all(
    order.tickets.map(async (ticket) => ({ ...ticket, image: await qrDataUrl(ticket.qrToken) })),
  );
  return (
    <CheckoutShell eyebrow={t.eyebrow} title={order.event.title} step={justBooked ? 2 : null}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {order.status === "refunded" ? (
            <p className="flex items-start gap-3 rounded-3xl bg-canary/25 p-5 text-[14px] text-deep-blue">
              <FiAlertCircle aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
              {t.refunded}
            </p>
          ) : null}
          {order.status === "pending" ? (
            <div className="space-y-4 rounded-3xl border border-hairline bg-white p-6">
              <p className="text-[15px] text-deep-blue">{t.notPaid}</p>
              <Button as={Link} href={CHECKOUT_ROUTES.payment(token)}>
                {t.goToPayment}
              </Button>
            </div>
          ) : null}
          {justBooked && tickets.length > 0 ? (
            <p role="status" className="rounded-3xl bg-mint-mist p-5 text-[14px] text-deep-blue">
              {t.emailSent}
            </p>
          ) : null}
          {order.event.onlineUrl ? (
            <p className="flex flex-wrap items-center gap-2 rounded-3xl border border-hairline bg-white p-5 text-[14px]">
              <span className="font-semibold text-deep-blue">{t.onlineLink}:</span>
              <a
                href={order.event.onlineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 break-all text-deep-blue underline underline-offset-4"
              >
                {order.event.onlineUrl}
                <FiExternalLink aria-hidden="true" size={13} />
              </a>
            </p>
          ) : null}
          <ul className="grid gap-5 sm:grid-cols-2">
            {tickets.map((ticket) => (
              <li
                key={ticket.code}
                className="flex flex-col items-center gap-3 rounded-3xl border border-hairline bg-white p-6 text-center"
              >
                <p className="font-semibold text-deep-blue">{ticket.ticketTypeName}</p>
                <Image
                  src={ticket.image}
                  alt={t.qrAlt(ticket.code)}
                  width={220}
                  height={220}
                  unoptimized
                  className={ticket.status === "valid" ? "" : "opacity-40"}
                />
                <p className="font-display text-xl tracking-[0.15em] text-deep-blue">
                  {ticket.code}
                </p>
                <p className="text-[12.5px] text-charcoal/65">
                  {ticket.checkedInAt
                    ? t.checkedInAt(formatDateTime(ticket.checkedInAt))
                    : t.status[ticket.status]}
                </p>
              </li>
            ))}
          </ul>
          {tickets.length > 0 ? (
            <p className="text-[12.5px] leading-relaxed text-charcoal/65">{t.keepSafe}</p>
          ) : null}
        </div>
        <OrderSummary order={order} />
      </div>
    </CheckoutShell>
  );
}

/** `/tra-cuu-ve` (docs/05 §5.4). */
export function LookupPage() {
  const t = TEXT.vi.lookup;
  return (
    <CheckoutShell eyebrow={t.eyebrow} title={t.title} step={null}>
      <div className="max-w-xl">
        <LookupFlow turnstileSiteKey={turnstileSiteKey()} />
      </div>
    </CheckoutShell>
  );
}
