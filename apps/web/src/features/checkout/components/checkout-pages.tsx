import Link from "next/link";
import { notFound } from "next/navigation";
import { FiAlertCircle, FiAlertTriangle, FiExternalLink, FiInfo } from "react-icons/fi";

import { Button, cn } from "@lavieco/ui";

import { turnstileSiteKey } from "@/lib/turnstile";

import { CHECKOUT_ROUTES } from "../constants/config";
import { TEXT } from "../constants/text";
import { getCheckoutEvent, getOrder, verifiedMember } from "../server/orders";
import { qrDataUrl } from "../server/qr";
import { formatDateTime, formatSchedule } from "../utils/format";
import { ticketState } from "../utils/ticket-state";
import { CheckoutForm } from "./checkout-form";
import { CheckoutShell } from "./checkout-shell";
import { LookupFlow } from "./lookup-flow";
import { OrderSummary } from "./order-summary";
import { PaymentPanel } from "./payment-panel";
import { PrintButton } from "./print-button";
import { TicketCard, type TicketCardData } from "./ticket-card";

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

/**
 * `/ve/[token]`: the tickets of an order, each as a pass with its QR (rendered here, never
 * stored) and its state. Void tickets (refunded order) come without `qrToken`, so no QR
 * is drawn for them anywhere, print included. Several tickets: swipe on phones (with
 * anchor chips, no JS needed), stacked from `md`; printed one per page.
 */
export async function TicketPage({ token, justBooked }: { token: string; justBooked: boolean }) {
  const order = await getOrder(token);
  if (!order) notFound();
  const t = TEXT.vi.ticket;
  const tickets: TicketCardData[] = await Promise.all(
    order.tickets.map(async (ticket) => ({
      code: ticket.code,
      ticketTypeName: ticket.ticketTypeName,
      state: ticketState(ticket, order.status),
      checkedInAt: ticket.checkedInAt ? formatDateTime(ticket.checkedInAt) : null,
      qrImage: ticket.qrToken ? await qrDataUrl(ticket.qrToken, 560) : null,
    })),
  );
  const online = order.event.format === "online";
  const event = {
    title: order.event.title,
    schedule: formatSchedule(order.event.startAt, order.event.endAt),
    place: online
      ? t.online
      : order.event.venue
        ? `${order.event.venue.name}, ${order.event.venue.address}`
        : "",
    online,
  };
  const many = tickets.length > 1;
  return (
    <CheckoutShell eyebrow={t.eyebrow} title={order.event.title} step={justBooked ? 2 : null}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
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
            <p
              role="status"
              className="rounded-3xl bg-mint-mist p-5 text-[14px] text-deep-blue print:hidden"
            >
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
          {tickets.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
              {many ? (
                <nav aria-label={t.switcher} className="-mx-1 min-w-0 flex-1 md:hidden">
                  <ul className="flex gap-2 overflow-x-auto px-1 pb-1">
                    {tickets.map((ticket, index) => (
                      <li key={ticket.code} className="shrink-0">
                        <a
                          href={`#ve-${ticket.code}`}
                          className="inline-flex rounded-full border border-hairline bg-white px-3 py-1.5 text-[12.5px] font-semibold text-deep-blue hover:border-deep-blue/40 focus-visible:outline-2 focus-visible:outline-emerald-brand"
                        >
                          {t.position(index + 1, tickets.length)}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              ) : null}
              <div className="ml-auto">
                <PrintButton />
              </div>
            </div>
          ) : null}
          {tickets.length > 0 ? (
            <ol
              className={cn(
                "flex gap-4 md:block md:space-y-6 print:block print:space-y-0",
                many &&
                  "-mx-4 snap-x snap-mandatory overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 md:mx-0 md:overflow-visible md:px-0 md:pb-0",
              )}
            >
              {tickets.map((ticket, index) => (
                <li
                  key={ticket.code}
                  className={cn(
                    "print:break-after-page print:last:break-after-auto",
                    many
                      ? "w-[86%] max-w-sm shrink-0 snap-center md:w-auto md:max-w-none"
                      : "w-full",
                  )}
                >
                  <TicketCard
                    ticket={ticket}
                    index={index + 1}
                    total={tickets.length}
                    event={event}
                    bookerName={order.buyer.fullName}
                  />
                </li>
              ))}
            </ol>
          ) : null}
          {order.event.safetyNotes ? (
            <section className="rounded-3xl border border-canary bg-canary/20 p-5 print:hidden">
              <h2 className="flex items-center gap-2 font-display text-lg text-deep-blue">
                <FiAlertTriangle aria-hidden="true" size={17} />
                {t.safetyTitle}
              </h2>
              <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-charcoal/85">
                {order.event.safetyNotes}
              </p>
            </section>
          ) : null}
          {tickets.some((ticket) => ticket.state === "valid") ? (
            <p className="text-[12.5px] leading-relaxed text-charcoal/65 print:text-charcoal">
              {t.keepSafe}
            </p>
          ) : null}
        </div>
        <div className="print:hidden">
          <OrderSummary order={order} />
        </div>
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
