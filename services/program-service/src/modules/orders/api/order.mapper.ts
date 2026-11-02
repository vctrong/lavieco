import type {
  OrderDetail,
  OrderListItem,
  OrderView,
  PublicVoucher,
  SharedTicketView,
  TicketLookupResponse,
} from "@lavieco/shared/events";

import type { EventRecord } from "../../events";
import type { VoucherRecord } from "../../vouchers";
import type { OrderBundle } from "../application/checkout-service";
import type { AdminOrderDetail } from "../application/order-admin-service";
import { maskEmail, maskPhone } from "../domain/masking";
import { answerText, peopleOf, type OrderRecord } from "../domain/order";
import type { TicketRecord } from "../domain/ticket";

const iso = (date: Date | null) => (date ? date.toISOString() : null);

/**
 * What the holder of an order link sees. Built field by field: the booker's email and
 * phone masked (anyone with the link can open it), the payment QR only while the order
 * is pending, the online link and safety notes only once it is paid. A refunded order
 * still lists its tickets, void and without `qrToken`, so no QR can be drawn for them.
 */
export function toOrderView({ order, event, tickets, shareTokens }: OrderBundle): OrderView {
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
    subtotal: order.subtotal,
    discount: order.discount ? { code: order.discount.code, amount: order.discount.amount } : null,
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
      seatsPerUnit: ticket.seatsPerUnit,
      unitIndex: ticket.unitIndex,
      seatIndex: ticket.seatIndex,
      shareToken: paid && ticket.status !== "void" ? (shareTokens.get(ticket.id) ?? null) : null,
    })),
    refundRequired: order.flags.refundRequired,
  };
}

/**
 * What a shared link shows, built field by field: a QR while the ticket can still be
 * used, the event, nothing about who booked it (BR-13). Tickets of a void order never
 * reach here with a QR: voiding happens on the ticket itself.
 */
export function toSharedTicketView({
  ticket,
  event,
}: {
  ticket: TicketRecord;
  event: EventRecord;
}): SharedTicketView {
  const live = ticket.status !== "void";
  return {
    code: ticket.code,
    ticketTypeName: ticket.ticketTypeName,
    status: ticket.status,
    qrToken: live ? ticket.qrToken : null,
    checkedInAt: iso(ticket.checkedInAt),
    seatsPerUnit: ticket.seatsPerUnit,
    unitIndex: ticket.unitIndex,
    seatIndex: ticket.seatIndex,
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
  };
}

export function toPublicVoucher({
  voucher,
  remaining,
}: {
  voucher: VoucherRecord;
  remaining: number | null;
}): PublicVoucher {
  return {
    code: voucher.code,
    name: voucher.name,
    description: voucher.description,
    discountType: voucher.discountType,
    value: voucher.value,
    maxDiscount: voucher.maxDiscount,
    minSeats: voucher.minSeats,
    minSubtotal: voucher.minSubtotal,
    remaining,
    endAt: iso(voucher.endAt),
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
      ticketCount: peopleOf(order.items),
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
    subtotal: order.subtotal,
    voucherCode: order.discount?.code ?? null,
    discountAmount: order.discount?.amount ?? 0,
    amount: order.amount,
    status: order.status,
    ticketCount: peopleOf(order.items),
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
      id: ticket.id,
      code: ticket.code,
      ticketTypeName: ticket.ticketTypeName,
      status: ticket.status,
      checkedInAt: iso(ticket.checkedInAt),
      seatsPerUnit: ticket.seatsPerUnit,
      unitIndex: ticket.unitIndex,
      seatIndex: ticket.seatIndex,
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
