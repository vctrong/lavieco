import type {
  OrderDetail,
  OrderListItem,
  OrderView,
  TicketLookupResponse,
} from "@lavieco/shared/events";

import type { EventRecord } from "../../events";
import type { OrderBundle } from "../application/checkout-service";
import type { AdminOrderDetail } from "../application/order-admin-service";
import { maskEmail, maskPhone } from "../domain/masking";
import { answerText, type OrderRecord } from "../domain/order";

const iso = (date: Date | null) => (date ? date.toISOString() : null);

/**
 * What the holder of an order link sees. Built field by field: the booker's email and
 * phone masked (anyone with the link can open it), the payment QR only while the order
 * is pending, the online link and safety notes only once it is paid. A refunded order
 * still lists its tickets, void and without `qrToken`, so no QR can be drawn for them.
 */
export function toOrderView({ order, event, tickets }: OrderBundle): OrderView {
  const paid = order.status === "paid";
  const refunded = order.status === "refunded";
  const shown = paid
    ? tickets.filter((ticket) => ticket.status !== "void")
    : refunded
      ? tickets
      : [];
  const live = paid && shown.length > 0;
  return {
    orderCode: order.orderCode,
    status: order.status,
    amount: order.amount,
    expiresAt: order.expiresAt.toISOString(),
    paidAt: iso(order.paidAt),
    buyer: {
      fullName: order.buyer.fullName,
      emailMasked: maskEmail(order.buyer.email),
      phoneMasked: maskPhone(order.buyer.phone),
    },
    event: {
      slug: event.slug,
      title: event.title,
      format: event.format,
      startAt: event.startAt.toISOString(),
      endAt: event.endAt.toISOString(),
      venue: event.venue,
      onlineUrl: live && event.format === "online" ? event.onlineUrl : null,
      safetyNotes: live ? event.safetyNotes : "",
    },
    items: order.items.map((item) => ({ ...item })),
    payment:
      order.status === "pending" && order.payment
        ? {
            qrCode: order.payment.qrCode,
            checkoutUrl: order.payment.checkoutUrl,
            bin: order.payment.bin,
            accountNumber: order.payment.accountNumber,
            accountName: order.payment.accountName,
            description: order.payment.description,
            expiresAt: order.payment.expiresAt.toISOString(),
          }
        : null,
    tickets: shown.map((ticket) => ({
      code: ticket.code,
      ticketTypeName: ticket.ticketTypeName,
      status: ticket.status,
      qrToken: paid && ticket.status !== "void" ? ticket.qrToken : null,
      checkedInAt: iso(ticket.checkedInAt),
    })),
    refundRequired: order.flags.refundRequired,
  };
}

export function toLookupDto(
  items: { accessToken: string; order: OrderRecord; event: EventRecord }[],
): TicketLookupResponse {
  return {
    items: items.map(({ accessToken, order, event }) => ({
      accessToken,
      orderCode: order.orderCode,
      status: order.status,
      amount: order.amount,
      ticketCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      event: { title: event.title, startAt: event.startAt.toISOString() },
    })),
  };
}

/** Admin list row (`order:read`): the booker's contact details are shown to the team. */
export function toOrderListItemDto(order: OrderRecord, event: EventRecord | null): OrderListItem {
  return {
    id: order.id,
    orderCode: order.orderCode,
    event: { id: order.eventId, title: event?.title ?? "" },
    buyer: {
      fullName: order.buyer.fullName,
      email: order.buyer.email,
      phone: order.buyer.phone,
    },
    amount: order.amount,
    status: order.status,
    ticketCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    flags: { ...order.flags },
    createdAt: order.createdAt.toISOString(),
    paidAt: iso(order.paidAt),
  };
}

export function toOrderDetailDto(detail: AdminOrderDetail): OrderDetail {
  const { order, event, tickets, answers, payments } = detail;
  const questions = new Map(event.form.questions.map((question) => [question.id, question]));
  return {
    ...toOrderListItemDto(order, event),
    items: order.items.map((item) => ({ ...item })),
    expiresAt: order.expiresAt.toISOString(),
    cancelledAt: iso(order.cancelledAt ?? order.expiredAt),
    refundedAt: iso(order.refundedAt),
    refundNote: order.refundNote,
    note: order.note,
    consentVersion: order.consent.version,
    tickets: tickets.map((ticket) => ({
      code: ticket.code,
      ticketTypeName: ticket.ticketTypeName,
      status: ticket.status,
      checkedInAt: iso(ticket.checkedInAt),
    })),
    answers: answers.map((answer) => {
      const question = questions.get(answer.questionId);
      return {
        questionId: answer.questionId,
        label: question?.label ?? "",
        hidden: question?.hidden ?? true,
        value: answerText(question, answer.value),
      };
    }),
    payments: payments.map((payment) => ({
      source: payment.source,
      amount: payment.amount,
      reference: payment.reference,
      transactionAt: payment.transactionAt,
      outcome: payment.outcome,
      createdAt: payment.createdAt.toISOString(),
    })),
    payos: { paymentLinkId: order.payment?.paymentLinkId ?? null },
    revision: order.revision,
  };
}
