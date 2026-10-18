import type { OutboxPort, TxContext, UnitOfWork } from "@lavieco/service-kit/ports";
import { DomainError, normalizeEmail, normalizePhone } from "@lavieco/shared";
import type { OrderCreateRequest } from "@lavieco/shared/events";

import {
  REVALIDATE_EVENT_JOB,
  checkoutQuestions,
  needsSafetyAcknowledgement,
  registrationBlocker,
  type EventRecord,
  type EventRepository,
} from "../../events";
import type { TicketTypeRepository } from "../../ticketing";
import { newOrderCode } from "../domain/codes";
import { HOLD_MS, NO_FLAGS, priceOrder, validateAnswers, type OrderRecord } from "../domain/order";
import type { TicketRecord } from "../domain/ticket";
import { CANCEL_PAYMENT_LINK_JOB, issueAndSend } from "./order-jobs";
import {
  VerificationUsedError,
  type OrderAnswerRepository,
  type OrderRepository,
  type TicketRepository,
} from "./ports/order-repositories.port";
import type { EmailProofVerifier, OrderLinks, PaymentGateway } from "./ports/order-services.port";

/** An order with what its holder's page shows. */
export type OrderBundle = { order: OrderRecord; event: EventRecord; tickets: TicketRecord[] };

export type CheckoutConfig = {
  /** Origin of `web`: payOS return/cancel URLs point at the payment page there. */
  webAppUrl: string;
};

/**
 * Registration and ticket purchase for visitors (docs/05 §5.1–5.2, BR-12 → BR-16).
 * The email proof comes first; seats are held atomically only after it, and the
 * price is recomputed here from the ticket types.
 */
export class CheckoutService {
  constructor(
    private readonly events: EventRepository,
    private readonly ticketTypes: TicketTypeRepository,
    private readonly orders: OrderRepository,
    private readonly answers: OrderAnswerRepository,
    private readonly tickets: TicketRepository,
    private readonly proofs: EmailProofVerifier,
    private readonly gateway: PaymentGateway,
    private readonly links: OrderLinks,
    private readonly unitOfWork: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly config: CheckoutConfig,
  ) {}

  async create(
    input: OrderCreateRequest,
    now = new Date(),
  ): Promise<{ accessToken: string; bundle: OrderBundle }> {
    // BR-12: the email of the booker passed OTP (or is a member's verified email).
    const proof = await this.proofs.verify(input.verificationToken, "checkout");
    const emailNormalized = normalizeEmail(input.buyer.email);
    if (proof.email !== emailNormalized) throw new DomainError("order.email_mismatch");

    // One proof, one order: a retried request gets the order it already created.
    const existing = await this.orders.findByVerificationId(proof.sub);
    if (existing) return this.withToken(existing.id);

    const event = await this.events.findPublicFullBySlug(input.eventSlug);
    if (!event) throw new DomainError("common.not_found");
    const ticketTypes = await this.ticketTypes.listByEvent(event.id);
    const blocker = registrationBlocker(event, ticketTypes, now);
    // A sold-out answer comes from the atomic seat update below, never from this read.
    if (blocker !== null && blocker !== "sold_out") {
      throw new DomainError("order.registration_closed", undefined, { reason: blocker });
    }
    if (needsSafetyAcknowledgement(event) && !input.safetyAcknowledged) {
      throw new DomainError("order.consent_required", undefined, { reason: "safety" });
    }
    // Events for children are booked by a parent or guardian (docs/05, BR-08).
    if (event.forChildren && !input.isGuardian) {
      throw new DomainError("order.consent_required", undefined, { reason: "guardian" });
    }
    const priced = priceOrder(ticketTypes, input.items, now);
    const answers = validateAnswers(checkoutQuestions(event.form.questions), input.answers);
    const free = priced.amount === 0;
    if (!free && !this.gateway.enabled) throw new DomainError("payment.unavailable");

    let orderCode = newOrderCode();
    while (await this.orders.findByOrderCode(orderCode)) orderCode = newOrderCode();
    const orderId = this.orders.newId();

    try {
      await this.unitOfWork.run(async (tx) => {
        // BR-14: conditional $inc per ticket type; the transaction undoes earlier ones.
        for (const item of priced.items) {
          const taken = await this.ticketTypes.take(
            item.ticketTypeId,
            item.quantity,
            free ? "sold" : "held",
            tx,
          );
          if (!taken) throw new DomainError("order.sold_out");
        }
        const order = await this.orders.insert(
          {
            id: orderId,
            orderCode,
            eventId: event.id,
            userId: proof.uid ?? null,
            verificationId: proof.sub,
            buyer: {
              fullName: input.buyer.fullName,
              email: input.buyer.email.trim(),
              emailNormalized,
              phone: input.buyer.phone.trim(),
              phoneNormalized: normalizePhone(input.buyer.phone)!,
              isGuardian: event.forChildren && input.isGuardian,
            },
            items: priced.items,
            amount: priced.amount,
            // Free: paid with amount 0, tickets issued right away (docs/05 §5.2).
            status: free ? "paid" : "pending",
            seatState: free ? "sold" : "held",
            expiresAt: new Date(now.getTime() + HOLD_MS),
            paidAt: free ? now : null,
            note: input.note,
            consent: { version: input.consentVersion, at: now },
            safetyAcknowledgedAt: input.safetyAcknowledged ? now : null,
            flags: NO_FLAGS,
          },
          tx,
        );
        await this.answers.insert(order.id, event.id, answers, tx);
        if (free) await issueAndSend(this.tickets, this.outbox, order, tx);
        await this.outbox.enqueue(tx, {
          type: REVALIDATE_EVENT_JOB,
          payload: { slug: event.slug },
        });
      });
    } catch (error) {
      if (error instanceof VerificationUsedError) {
        const raced = await this.orders.findByVerificationId(proof.sub);
        if (raced) return this.withToken(raced.id);
      }
      throw error;
    }

    if (!free) await this.attachPaymentLink(orderId, now);
    return this.withToken(orderId);
  }

  /** The order behind a signed link, or 404. */
  async getByToken(token: string): Promise<OrderBundle> {
    return this.load(this.orderIdOf(token));
  }

  /**
   * The buyer gives up a pending order: seats go back at once and the payOS link is
   * cancelled through the outbox. A payment that still arrives later is settled like
   * one after expiry (seats taken again if any, otherwise refund required).
   */
  async cancelByToken(token: string, now = new Date()): Promise<OrderBundle> {
    const orderId = this.orderIdOf(token);
    const current = await this.orders.findById(orderId);
    if (!current) throw new DomainError("common.not_found");
    if (current.status === "cancelled") return this.load(orderId);
    await this.unitOfWork.run(async (tx) => {
      const order = await this.orders.transition(
        orderId,
        { statuses: ["pending"], seatState: "held" },
        { status: "cancelled", seatState: "released", cancelledAt: now },
        tx,
      );
      if (!order) throw new DomainError("order.invalid_state");
      await this.releaseHeld(order, tx);
    });
    return this.load(orderId);
  }

  /** `/tra-cuu-ve`: every paid order of an email that just passed OTP (`ticket_lookup`). */
  async lookup(verificationToken: string) {
    const proof = await this.proofs.verify(verificationToken, "ticket_lookup");
    const orders = await this.orders.listByEmail(proof.email, 50);
    const events = new Map(
      (await this.events.findByIds([...new Set(orders.map((order) => order.eventId))])).map(
        (event) => [event.id, event],
      ),
    );
    return orders.flatMap((order) => {
      const event = events.get(order.eventId);
      return event ? [{ accessToken: this.links.sign(order.id), order, event }] : [];
    });
  }

  /** Seats back and payOS link cancelled; shared with the expiry job. */
  async releaseHeld(order: OrderRecord, tx: TxContext) {
    for (const item of order.items) {
      await this.ticketTypes.release(item.ticketTypeId, item.quantity, "held", tx);
    }
    if (order.payment) {
      await this.outbox.enqueue(tx, {
        type: CANCEL_PAYMENT_LINK_JOB,
        payload: { orderId: order.id },
      });
    }
    const event = (await this.events.findByIds([order.eventId]))[0];
    if (event) {
      await this.outbox.enqueue(tx, { type: REVALIDATE_EVENT_JOB, payload: { slug: event.slug } });
    }
  }

  async load(orderId: string): Promise<OrderBundle> {
    const order = await this.orders.findById(orderId);
    const event = order ? (await this.events.findByIds([order.eventId]))[0] : undefined;
    if (!order || !event) throw new DomainError("common.not_found");
    // A refunded order keeps listing its (void) tickets on the ticket page.
    const hasTickets = order.status === "paid" || order.status === "refunded";
    const tickets = hasTickets ? await this.tickets.listByOrder(order.id) : [];
    return { order, event, tickets };
  }

  signLink(orderId: string): string {
    return this.links.sign(orderId);
  }

  /** payOS link after the hold is committed: never call an outside service in a transaction. */
  private async attachPaymentLink(orderId: string, now: Date) {
    const order = (await this.orders.findById(orderId))!;
    const page = `${this.config.webAppUrl}/chuong-trinh/thanh-toan/${this.links.sign(orderId)}`;
    try {
      const link = await this.gateway.createLink({
        orderCode: order.orderCode,
        amount: order.amount,
        items: order.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.unitPrice,
        })),
        returnUrl: `${page}?ket-qua=1`,
        cancelUrl: `${page}?huy=1`,
        expiresAt: order.expiresAt,
      });
      await this.orders.setPayment(orderId, link);
    } catch {
      // No link, no way to pay: give the seats back right away instead of in 15 minutes.
      await this.unitOfWork.run(async (tx) => {
        const cancelled = await this.orders.transition(
          orderId,
          { statuses: ["pending"], seatState: "held" },
          { status: "cancelled", seatState: "released", cancelledAt: now },
          tx,
        );
        if (cancelled) await this.releaseHeld(cancelled, tx);
      });
      throw new DomainError("payment.unavailable");
    }
  }

  private async withToken(orderId: string) {
    return { accessToken: this.links.sign(orderId), bundle: await this.load(orderId) };
  }

  private orderIdOf(token: string): string {
    const orderId = this.links.verify(token);
    if (!orderId) throw new DomainError("common.not_found");
    return orderId;
  }
}
