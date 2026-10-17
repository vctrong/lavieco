import Link from "next/link";
import { FiAlertTriangle, FiArrowLeft, FiInfo } from "react-icons/fi";

import type { OrderDetail } from "@lavieco/shared/events";
import type { StaffProfile } from "@lavieco/shared/identity";
import { can } from "@lavieco/shared/permissions";

import { TEXT } from "../constants/text";
import { formatDateTime, formatVnd } from "../utils/format";
import { OrderActions } from "./order-actions";
import { OrderStatusBadge } from "./order-status-badge";
import { PageHeader } from "./page-header";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-hairline bg-white p-5">
      <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-museum text-deep-blue/65">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** `/orders/[id]`: tickets, answers, payment events and the order actions. */
export function OrderDetailPage({ order, staff }: { order: OrderDetail; staff: StaffProfile }) {
  const t = TEXT.vi;
  const timeline: [string, string | null][] = [
    [t.detail.createdAt, order.createdAt],
    [t.detail.expiresAt, order.status === "pending" ? order.expiresAt : null],
    [t.detail.paidAt, order.paidAt],
    [t.detail.cancelledAt, order.cancelledAt],
    [t.detail.refundedAt, order.refundedAt],
  ];
  const canRead = can(staff, "order:read");
  return (
    <>
      <PageHeader
        back={
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-deep-blue/70 hover:text-deep-blue"
          >
            <FiArrowLeft aria-hidden="true" size={14} />
            {t.detail.back}
          </Link>
        }
        eyebrow={t.detail.eyebrow(order.orderCode)}
        title={order.event.title}
        actions={<OrderStatusBadge status={order.status} />}
      />

      <div className="mb-6 space-y-3">
        {order.flags.refundRequired && order.status === "paid" ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-3xl border border-canary bg-canary/20 px-5 py-4 text-[13.5px] text-deep-blue"
          >
            <FiAlertTriangle aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
            {t.detail.flags.refundRequired}
          </p>
        ) : null}
        {order.flags.amountMismatch ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-3xl border border-canary bg-canary/20 px-5 py-4 text-[13.5px] text-deep-blue"
          >
            <FiAlertTriangle aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
            {t.detail.flags.amountMismatch}
          </p>
        ) : null}
        {order.flags.latePayment ? (
          <p className="flex items-start gap-2 rounded-3xl bg-mint-mist px-5 py-4 text-[13.5px] text-deep-blue">
            <FiInfo aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
            {t.detail.flags.latePayment}
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card title={t.detail.tickets}>
            {order.tickets.length === 0 ? (
              <p className="text-[13.5px] text-charcoal/60">{t.detail.noTickets}</p>
            ) : (
              <ul className="divide-y divide-hairline text-[13.5px]">
                {order.tickets.map((ticket) => (
                  <li
                    key={ticket.code}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <span>
                      <span className="font-semibold tracking-wider text-deep-blue">
                        {ticket.code}
                      </span>
                      <span className="ml-2 text-charcoal/65">{ticket.ticketTypeName}</span>
                    </span>
                    <span className="text-[12.5px] text-charcoal/70">
                      {ticket.checkedInAt
                        ? t.detail.checkedInAt(formatDateTime(ticket.checkedInAt))
                        : t.ticketStatus[ticket.status]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t.detail.answers}>
            {order.answers.length === 0 ? (
              <p className="text-[13.5px] text-charcoal/60">{t.detail.noAnswers}</p>
            ) : (
              <dl className="space-y-3 text-[13.5px]">
                {order.answers.map((answer) => (
                  <div key={answer.questionId}>
                    <dt className="text-[12px] text-charcoal/60">
                      {answer.label} {answer.hidden ? t.detail.hiddenQuestion : ""}
                    </dt>
                    <dd className="whitespace-pre-line text-deep-blue">{answer.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {order.note ? (
              <div className="mt-4 border-t border-hairline pt-3 text-[13.5px]">
                <p className="text-[12px] text-charcoal/60">{t.detail.note}</p>
                <p className="whitespace-pre-line text-deep-blue">{order.note}</p>
              </div>
            ) : null}
          </Card>

          <Card title={t.detail.payments}>
            {order.payments.length === 0 ? (
              <p className="text-[13.5px] text-charcoal/60">{t.detail.noPayments}</p>
            ) : (
              <ul className="divide-y divide-hairline text-[13px]">
                {order.payments.map((payment, index) => (
                  <li
                    key={index}
                    className="grid gap-1 py-2.5 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4"
                  >
                    <span className="font-semibold text-deep-blue">
                      {t.detail.paymentSource[payment.source]}
                    </span>
                    <span className="text-charcoal/75">
                      {t.paymentOutcome[payment.outcome]} · {formatVnd(payment.amount)}
                      {payment.reference ? ` · ${t.detail.reference} ${payment.reference}` : ""}
                    </span>
                    <span className="text-[12px] text-charcoal/60">
                      {formatDateTime(payment.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="space-y-6">
          <OrderActions
            orderId={order.id}
            revision={order.revision}
            canReconcile={
              canRead &&
              order.amount > 0 &&
              order.payos.paymentLinkId !== null &&
              order.status !== "refunded"
            }
            canResend={canRead && order.status === "paid" && order.tickets.length > 0}
            canRefund={can(staff, "order:refund") && order.status === "paid"}
          />
          <Card title={t.detail.buyer}>
            <p className="font-semibold text-deep-blue">{order.buyer.fullName}</p>
            <p className="break-all text-[13px] text-charcoal/70">{order.buyer.email}</p>
            <p className="text-[13px] text-charcoal/70">{order.buyer.phone}</p>
          </Card>
          <Card title={t.detail.items}>
            <ul className="space-y-1.5 text-[13.5px]">
              {order.items.map((item) => (
                <li key={item.ticketTypeId} className="flex justify-between gap-3">
                  <span className="text-charcoal/80">
                    {t.orders.tickets(item.quantity)} · {item.name}
                  </span>
                  <span className="shrink-0 text-deep-blue">
                    {item.unitPrice === 0 ? t.free : formatVnd(item.unitPrice * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-hairline pt-3 text-right font-display text-xl text-deep-blue">
              {order.amount === 0 ? t.free : formatVnd(order.amount)}
            </p>
          </Card>
          <Card title={t.detail.timeline}>
            <dl className="space-y-1.5 text-[13px]">
              {timeline
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-charcoal/60">{label}</dt>
                    <dd className="text-deep-blue">{formatDateTime(value!)}</dd>
                  </div>
                ))}
            </dl>
            {order.refundNote ? (
              <p className="mt-3 border-t border-hairline pt-3 text-[13px] text-charcoal/75">
                {t.detail.refundNote}: {order.refundNote}
              </p>
            ) : null}
            <p className="mt-3 border-t border-hairline pt-3 text-[12px] text-charcoal/55">
              {t.detail.consent}: {order.consentVersion}
              {order.payos.paymentLinkId
                ? ` · ${t.detail.paymentLink}: ${order.payos.paymentLinkId}`
                : ""}
            </p>
          </Card>
        </aside>
      </div>
    </>
  );
}
