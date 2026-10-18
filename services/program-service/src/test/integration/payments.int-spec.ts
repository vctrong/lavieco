import { PayOS } from "@payos/node";
import { mongo } from "mongoose";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import { orderCreateResponseSchema, orderViewSchema } from "@lavieco/shared/events";

import { PAYMENT_GATEWAY } from "../../modules/orders";
import { PayosGateway } from "../../modules/payments";
import { BUYER, book, publishedEvent } from "../support/fixtures";
import {
  FakePaymentGateway,
  bearer,
  createTestApp,
  drainOutbox,
  type TestApp,
} from "../support/test-app";

const CHECKSUM_KEY = "checksum-key-for-integration-tests";

/** payOS stand-in for links and status, but webhook signatures checked by the real SDK. */
class SdkVerifyingGateway extends FakePaymentGateway {
  private readonly real = new PayosGateway({
    clientId: "client",
    apiKey: "api",
    checksumKey: CHECKSUM_KEY,
  });
  override verifyWebhook(body: unknown) {
    return this.real.verifyWebhook(body);
  }
}

let t: TestApp;
const gateway = new SdkVerifyingGateway();
const sdk = new PayOS({ clientId: "c", apiKey: "a", checksumKey: CHECKSUM_KEY, logLevel: "off" });

beforeAll(async () => {
  t = await createTestApp(inject("mongoUri"), {
    paymentGateway: { provide: PAYMENT_GATEWAY, useValue: gateway },
  });
});

afterAll(async () => {
  await t?.close();
});

const web = async () => bearer(await t.serviceToken("web"));

async function webhookBody(
  orderCode: number,
  amount: number,
  options: { reference?: string; key?: string } = {},
) {
  const data = {
    orderCode,
    amount,
    description: "LAVIECO",
    accountNumber: "0123456789",
    reference: options.reference ?? `FT${orderCode}`,
    transactionDateTime: "2026-10-20 10:00:00",
    currency: "VND",
    paymentLinkId: `link-${orderCode}`,
    code: "00",
    desc: "Thành công",
    counterAccountBankId: "",
    counterAccountBankName: "",
    counterAccountName: "TEN NGUOI CHUYEN",
    counterAccountNumber: "123",
    virtualAccountName: "",
    virtualAccountNumber: "",
  };
  const signature = await sdk.crypto.createSignatureFromObj(data, options.key ?? CHECKSUM_KEY);
  return { code: "00", desc: "success", success: true, data, signature };
}

async function postWebhook(body: unknown) {
  return t
    .http()
    .post("/internal/v1/payment-webhooks/payos")
    .set("authorization", await web())
    .send(body as object);
}

async function seats(ticketTypeId: string) {
  const doc = await t.db
    .collection("ticket_types")
    .findOne({ _id: new mongo.ObjectId(ticketTypeId) });
  return { sold: doc?.sold as number, held: doc?.held as number };
}

async function ticketCount(orderCode: number) {
  const order = await t.db.collection("orders").findOne({ orderCode });
  return t.db.collection("tickets").countDocuments({ orderId: order!._id });
}

async function view(token: string) {
  const res = await t
    .http()
    .get(`/internal/v1/order-links/${token}`)
    .set("authorization", await web())
    .expect(200);
  return orderViewSchema.parse(res.body);
}

async function paidEventOrder(quantity = 2, ticketQuantity = 20, email = BUYER.email) {
  const { event, ticketTypeIds } = await publishedEvent(t, {
    tickets: [{ price: 120_000, quantity: ticketQuantity }],
  });
  const res = await book(t, {
    slug: event.slug,
    items: [{ ticketTypeId: ticketTypeIds[0]!, quantity }],
    buyer: { ...BUYER, email },
  });
  expect(res.status).toBe(201);
  return {
    event,
    ticketTypeId: ticketTypeIds[0]!,
    created: orderCreateResponseSchema.parse(res.body),
  };
}

describe("payOS webhook", () => {
  it("marks paid, moves held → sold and issues the tickets once, even when sent twice", async () => {
    const { ticketTypeId, created } = await paidEventOrder(2);
    const { orderCode, amount } = created.order;
    const body = await webhookBody(orderCode, amount);

    const [first, second] = await Promise.all([postWebhook(body), postWebhook(body)]);
    expect([first.status, second.status]).toEqual([200, 200]);
    expect((await postWebhook(body)).status).toBe(200);

    expect(await seats(ticketTypeId)).toEqual({ sold: 2, held: 0 });
    expect(await ticketCount(orderCode)).toBe(2);
    const order = await view(created.accessToken);
    expect(order).toMatchObject({ status: "paid", payment: null });
    expect(order.tickets).toHaveLength(2);

    const outcomes = (await t.db.collection("payment_events").find({ orderCode }).toArray()).map(
      (event) => event.outcome,
    );
    expect(outcomes.filter((outcome) => outcome === "paid")).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome === "duplicate")).toHaveLength(2);
    // Reconciliation fields only, never the payer's name or account.
    const stored = JSON.stringify(
      await t.db.collection("payment_events").find({ orderCode }).toArray(),
    );
    expect(stored).not.toContain("TEN NGUOI CHUYEN");

    await drainOutbox(t);
    expect(t.emails.to(BUYER.email).filter((mail) => mail.subject.includes("Vé"))).toHaveLength(1);
  });

  it("refuses a wrong signature and changes nothing", async () => {
    const { ticketTypeId, created } = await paidEventOrder(1);
    const forged = await webhookBody(created.order.orderCode, created.order.amount, {
      key: "not-our-key",
    });
    const res = await postWebhook(forged);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("payment.signature_invalid");
    expect((await view(created.accessToken)).status).toBe("pending");
    expect(await seats(ticketTypeId)).toEqual({ sold: 0, held: 1 });
    expect(
      await t.db
        .collection("payment_events")
        .countDocuments({ orderCode: created.order.orderCode }),
    ).toBe(0);
  });

  it("flags another amount and issues nothing", async () => {
    const { ticketTypeId, created } = await paidEventOrder(1);
    const res = await postWebhook(await webhookBody(created.order.orderCode, 1_000));
    expect(res.status).toBe(200);
    const order = await t.db.collection("orders").findOne({ orderCode: created.order.orderCode });
    expect(order).toMatchObject({ status: "pending", flags: { amountMismatch: true } });
    expect(await seats(ticketTypeId)).toEqual({ sold: 0, held: 1 });
    expect(await ticketCount(created.order.orderCode)).toBe(0);
  });

  it("answers 200 to payOS's sample for an unknown order code", async () => {
    const res = await postWebhook(await webhookBody(123, 3000));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });

  it("is reachable by the web BFF only", async () => {
    const res = await t
      .http()
      .post("/internal/v1/payment-webhooks/payos")
      .set("authorization", bearer(await t.serviceToken("admin")))
      .send(await webhookBody(123, 3000));
    expect(res.status).toBe(403);
  });
});

describe("payment after the hold ended", () => {
  it("takes the seats again when some are left (expired order)", async () => {
    const { ticketTypeId, created } = await paidEventOrder(2);
    await t.expireHolds(new Date(Date.now() + 16 * 60_000));
    expect(await seats(ticketTypeId)).toEqual({ sold: 0, held: 0 });

    await postWebhook(await webhookBody(created.order.orderCode, created.order.amount));
    const order = await t.db.collection("orders").findOne({ orderCode: created.order.orderCode });
    expect(order).toMatchObject({
      status: "paid",
      flags: { latePayment: true, refundRequired: false },
    });
    expect(await seats(ticketTypeId)).toEqual({ sold: 2, held: 0 });
    expect(await ticketCount(created.order.orderCode)).toBe(2);
  });

  it("records paid + refund required when the seats are gone (cancelled order)", async () => {
    const { event, ticketTypeId, created } = await paidEventOrder(1, 1);
    await t
      .http()
      .post(`/internal/v1/order-links/${created.accessToken}/cancel`)
      .set("authorization", await web())
      .expect(200);
    // Someone else books the freed seat.
    const other = await book(t, {
      slug: event.slug,
      items: [{ ticketTypeId, quantity: 1 }],
      buyer: { ...BUYER, email: "nguoi.sau@example.test" },
    });
    expect(other.status).toBe(201);

    await postWebhook(await webhookBody(created.order.orderCode, created.order.amount));
    const order = await t.db.collection("orders").findOne({ orderCode: created.order.orderCode });
    expect(order).toMatchObject({
      status: "paid",
      seatState: "released",
      flags: { refundRequired: true },
    });
    expect(await seats(ticketTypeId)).toEqual({ sold: 0, held: 1 });
    expect(await ticketCount(created.order.orderCode)).toBe(0);
    expect((await view(created.accessToken)).refundRequired).toBe(true);
  });
});

describe("return page reconciliation", () => {
  it("asks payOS when the order is still pending, through the same settlement", async () => {
    const { created } = await paidEventOrder(1);
    const { orderCode, amount } = created.order;

    const pending = await t
      .http()
      .post(`/internal/v1/order-links/${created.accessToken}/reconcile`)
      .set("authorization", await web())
      .expect(200);
    expect(pending.body.status).toBe("pending");

    gateway.statuses.set(orderCode, {
      status: "PAID",
      amountPaid: amount,
      paymentLinkId: `link-${orderCode}`,
      transactions: [{ reference: "FT-R", amount, transactionDateTime: "2026-10-20 10:01:00" }],
    });
    // Throttled: a second call within 10 s does not ask payOS again.
    const throttled = await t
      .http()
      .post(`/internal/v1/order-links/${created.accessToken}/reconcile`)
      .set("authorization", await web())
      .expect(200);
    expect(throttled.body.status).toBe("pending");

    await t.db
      .collection("orders")
      .updateOne({ orderCode }, { $set: { lastReconciledAt: new Date(Date.now() - 60_000) } });
    const paid = await t
      .http()
      .post(`/internal/v1/order-links/${created.accessToken}/reconcile`)
      .set("authorization", await web())
      .expect(200);
    expect(paid.body.status).toBe("paid");
    expect(paid.body.tickets).toHaveLength(1);

    // The webhook arriving afterwards changes nothing.
    await postWebhook(await webhookBody(orderCode, amount));
    expect(await ticketCount(orderCode)).toBe(1);
  });
});
