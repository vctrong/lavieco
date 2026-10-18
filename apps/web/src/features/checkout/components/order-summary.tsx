import { FiCalendar, FiMapPin, FiVideo } from "react-icons/fi";

import type { OrderView } from "@lavieco/shared/events";

import { TEXT } from "../constants/text";
import { formatSchedule, formatVnd } from "../utils/format";

/** Event, booker and amounts of an order (payment and ticket pages). */
export function OrderSummary({ order }: { order: OrderView }) {
  const t = TEXT.vi;
  const Place = order.event.format === "online" ? FiVideo : FiMapPin;
  return (
    <aside className="space-y-5 rounded-3xl border border-hairline bg-white p-6 lg:sticky lg:top-28 lg:self-start">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-museum text-emerald-brand">
          {t.ticket.orderCode} {order.orderCode}
        </p>
        <h2 className="mt-1 font-display text-xl text-deep-blue">{order.event.title}</h2>
      </div>
      <dl className="space-y-3 text-[14px]">
        <div className="flex items-start gap-3">
          <dt className="sr-only">{t.ticket.when}</dt>
          <FiCalendar aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-emerald-brand" />
          <dd>{formatSchedule(order.event.startAt, order.event.endAt)}</dd>
        </div>
        <div className="flex items-start gap-3">
          <dt className="sr-only">{t.ticket.where}</dt>
          <Place aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-emerald-brand" />
          <dd>
            {order.event.format === "online"
              ? t.ticket.online
              : order.event.venue
                ? `${order.event.venue.name}, ${order.event.venue.address}`
                : ""}
          </dd>
        </div>
        <div className="rounded-2xl bg-mint-mist/60 px-4 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-museum text-deep-blue/60">
            {t.ticket.bookedBy}
          </dt>
          <dd className="mt-1 font-semibold text-deep-blue">{order.buyer.fullName}</dd>
          {/* Masked by program-service: anyone holding the order link sees this page. */}
          <dd className="break-all text-[13px] text-charcoal/70">
            {order.buyer.emailMasked} · {order.buyer.phoneMasked}
          </dd>
        </div>
      </dl>
      <ul className="space-y-2 border-t border-hairline pt-4 text-[14px] text-charcoal/80">
        {order.items.map((item) => (
          <li key={item.ticketTypeId} className="flex justify-between gap-3">
            <span>{t.checkout.line(item.quantity, item.name)}</span>
            <span className="shrink-0">
              {item.unitPrice === 0 ? t.checkout.free : formatVnd(item.unitPrice * item.quantity)}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-end justify-between gap-3 rounded-2xl bg-mint-mist px-4 py-3">
        <span className="text-[12px] font-semibold uppercase tracking-museum text-deep-blue/70">
          {t.checkout.total}
        </span>
        <span className="font-display text-2xl text-deep-blue">
          {order.amount === 0 ? t.checkout.totalFree : formatVnd(order.amount)}
        </span>
      </div>
    </aside>
  );
}
