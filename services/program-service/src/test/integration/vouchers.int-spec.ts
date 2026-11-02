import { mongo } from "mongoose";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import {
  orderCreateResponseSchema,
  publicVoucherListSchema,
  voucherCheckResponseSchema,
  voucherSchema,
} from "@lavieco/shared/events";

import { PAYMENT_GATEWAY } from "../../modules/orders";
import { BUYER, book, publishedEvent } from "../support/fixtures";
import { FakePaymentGateway, bearer, createTestApp, type TestApp } from "../support/test-app";

let t: TestApp;
const gateway = new FakePaymentGateway();

beforeAll(async () => {
  t = await createTestApp(inject("mongoUri"), {
    paymentGateway: { provide: PAYMENT_GATEWAY, useValue: gateway },
  });
});

afterAll(async () => {
  await t?.close();
});

const staff = async () => bearer(await t.staffToken(["coordinator"]));
const web = async () => bearer(await t.serviceToken("web"));
let sequence = 0;
const uniqueEmail = () => `khach${(sequence += 1)}@example.test`;
const buyer = (email = uniqueEmail()) => ({ ...BUYER, email });

async function createVoucher(body: Record<string, unknown>) {
  const res = await t
    .http()
    .post("/internal/v1/vouchers")
    .set("authorization", await staff())
    .send({ name: "Ưu đãi", discountType: "percent", value: 10, scope: "global", ...body })
    .expect(201);
  return voucherSchema.parse(res.body);
}

const counters = async (id: string) => {
  const doc = await t.db.collection("vouchers").findOne({ _id: new mongo.ObjectId(id) });
  return { used: doc?.used as number, held: doc?.held as number };
};

const priced = () => publishedEvent(t, { tickets: [{ price: 100_000, maxPerOrder: 4 }] });

describe("the plan's examples", () => {
  it("GIAM2NGUOI: event code, from 2 people, 10% off", async () => {
    const { event, ticketTypeIds } = await priced();
    const code = `GIAM2-${event.slug.slice(-8).toUpperCase()}`;
    await createVoucher({ code, scope: "event", eventId: event.id, minSeats: 2 });
    const ticketTypeId = ticketTypeIds[0]!;

    const one = await book(t, {
      slug: event.slug,
      items: [{ ticketTypeId, quantity: 1 }],
      buyer: buyer(),
      voucherCode: code,
    });
    expect(one.status).toBe(422);
    expect(one.body.code).toBe("voucher.invalid");

    const two = await book(t, {
      slug: event.slug,
      items: [{ ticketTypeId, quantity: 2 }],
      buyer: buyer(),
      voucherCode: code,
    });
    expect(two.status).toBe(201);
    const { order } = orderCreateResponseSchema.parse(two.body);
    expect(order).toMatchObject({
      subtotal: 200_000,
      discount: { code, amount: 20_000 },
      amount: 180_000,
      status: "pending",
    });
  });

  it("THANTHIET: global code for customers with 2 paid orders, 20k off", async () => {
    const { event, ticketTypeIds } = await priced();
    const code = `THAN-${event.slug.slice(-8).toUpperCase()}`;
    await createVoucher({
      code,
      discountType: "fixed",
      value: 20_000,
      eligibility: "loyal",
      minPaidOrders: 2,
    });
    const email = uniqueEmail();
    const ticketTypeId = ticketTypeIds[0]!;
    const refused = await book(t, {
      slug: event.slug,
      items: [{ ticketTypeId, quantity: 1 }],
      buyer: buyer(email),
      voucherCode: code,
    });
    expect(refused.status).toBe(422);

    // Two paid orders of this email, then the code works.
    const orders = t.db.collection("orders");
    const template = await orders.findOne({ status: "pending" });
    for (const orderCode of [91000001, 91000002]) {
      await orders.insertOne({
        ...template,
        _id: new mongo.ObjectId(),
        orderCode,
        verificationId: `seed-${orderCode}-${email}`,
        status: "paid",
        seatState: "sold",
        amount: 50_000,
        buyer: { ...template!.buyer, email, emailNormalized: email },
      });
    }
    const accepted = await book(t, {
      slug: event.slug,
      items: [{ ticketTypeId, quantity: 1 }],
      buyer: buyer(email),
      voucherCode: code,
    });
    expect(accepted.status).toBe(201);
    expect(orderCreateResponseSchema.parse(accepted.body).order.amount).toBe(80_000);
  });

  it("a 5-use code taken by 10 people at once: exactly 5 orders get it", async () => {
    const { event, ticketTypeIds } = await publishedEvent(t, {
      tickets: [{ price: 100_000, quantity: 50, maxPerOrder: 4 }],
    });
    const code = `SAN-${event.slug.slice(-8).toUpperCase()}`;
    const voucher = await createVoucher({ code, totalUses: 5, visibility: "public" });
    const attempts = await Promise.all(
      Array.from({ length: 10 }, () =>
        book(t, {
          slug: event.slug,
          items: [{ ticketTypeId: ticketTypeIds[0]!, quantity: 1 }],
          buyer: buyer(),
          voucherCode: code,
        }),
      ),
    );
    const statuses = attempts.map((res) => res.status);
    expect(statuses.filter((status) => status === 201)).toHaveLength(5);
    expect(statuses.filter((status) => status === 422)).toHaveLength(5);
    expect(await counters(voucher.id)).toEqual({ used: 0, held: 5 });
  });
});

describe("a use follows the order", () => {
  it("goes back when the order is cancelled; a code cannot be reused while held", async () => {
    const { event, ticketTypeIds } = await priced();
    const code = `VONG-${event.slug.slice(-8).toUpperCase()}`;
    const voucher = await createVoucher({ code, totalUses: 1 });
    const email = uniqueEmail();
    const res = await book(t, {
      slug: event.slug,
      items: [{ ticketTypeId: ticketTypeIds[0]!, quantity: 1 }],
      buyer: buyer(email),
      voucherCode: code,
    });
    const { accessToken } = orderCreateResponseSchema.parse(res.body);
    expect(await counters(voucher.id)).toEqual({ used: 0, held: 1 });

    await t
      .http()
      .post(`/internal/v1/order-links/${accessToken}/cancel`)
      .set("authorization", await web())
      .expect(200);
    expect(await counters(voucher.id)).toEqual({ used: 0, held: 0 });

    const again = await book(t, {
      slug: event.slug,
      items: [{ ticketTypeId: ticketTypeIds[0]!, quantity: 1 }],
      buyer: buyer(email),
      voucherCode: code,
    });
    expect(again.status).toBe(201);
  });

  it("is used once per customer, and a 100% code goes the free way", async () => {
    const { event, ticketTypeIds } = await priced();
    const code = `FREE-${event.slug.slice(-8).toUpperCase()}`;
    const voucher = await createVoucher({ code, value: 100, perCustomer: 1 });
    const email = uniqueEmail();
    const ticketTypeId = ticketTypeIds[0]!;
    const first = await book(t, {
      slug: event.slug,
      items: [{ ticketTypeId, quantity: 1 }],
      buyer: buyer(email),
      voucherCode: code,
    });
    expect(orderCreateResponseSchema.parse(first.body).order).toMatchObject({
      status: "paid",
      amount: 0,
    });
    expect(await counters(voucher.id)).toEqual({ used: 1, held: 0 });
    const second = await book(t, {
      slug: event.slug,
      items: [{ ticketTypeId, quantity: 1 }],
      buyer: buyer(email),
      voucherCode: code,
    });
    expect(second.status).toBe(422);
  });

  it("refuses an amount too small for the payment provider, with its own error", async () => {
    const { event, ticketTypeIds } = await publishedEvent(t, {
      tickets: [{ price: 2_500, maxPerOrder: 4 }],
    });
    const code = `MIN-${event.slug.slice(-8).toUpperCase()}`;
    await createVoucher({ code, discountType: "fixed", value: 1_000 });
    const res = await book(t, {
      slug: event.slug,
      items: [{ ticketTypeId: ticketTypeIds[0]!, quantity: 1 }],
      buyer: buyer(),
      voucherCode: code,
    });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("voucher.amount_too_low");
  });
});

describe("public side", () => {
  it("previews a code, and refuses unknown and paused ones with the same answer", async () => {
    const { event, ticketTypeIds } = await priced();
    const code = `XEM-${event.slug.slice(-8).toUpperCase()}`;
    const voucher = await createVoucher({ code });
    const check = async (typed: string) =>
      t
        .http()
        .post("/internal/v1/voucher-checks")
        .set("authorization", await web())
        .send({
          eventSlug: event.slug,
          items: [{ ticketTypeId: ticketTypeIds[0]!, quantity: 1 }],
          code: typed,
          clientIp: `10.0.0.${(sequence += 1)}`,
        });
    const ok = await check(code);
    expect(ok.status).toBe(200);
    expect(voucherCheckResponseSchema.parse(ok.body)).toMatchObject({
      subtotal: 100_000,
      discount: 10_000,
      amount: 90_000,
    });
    const unknown = await check("KHONGCO");
    await t
      .http()
      .post(`/internal/v1/vouchers/${voucher.id}/status`)
      .set("authorization", await staff())
      .send({ status: "paused", revision: voucher.revision })
      .expect(200);
    const paused = await check(code);
    expect(unknown.status).toBe(422);
    expect(paused.status).toBe(422);
    expect(unknown.body.code).toBe(paused.body.code);
    expect(unknown.body.title).toBe(paused.body.title);
  });

  it("limits how fast one address can try codes", async () => {
    const { event, ticketTypeIds } = await priced();
    const clientIp = "10.9.9.9";
    let last = 0;
    for (let attempt = 0; attempt < 21; attempt += 1) {
      const res = await t
        .http()
        .post("/internal/v1/voucher-checks")
        .set("authorization", await web())
        .send({
          eventSlug: event.slug,
          items: [{ ticketTypeId: ticketTypeIds[0]!, quantity: 1 }],
          code: `THU${attempt}A`,
          clientIp,
        });
      last = res.status;
    }
    expect(last).toBe(429);
  });

  it("lists only public codes that apply, with uses left and no private fields", async () => {
    const { event } = await priced();
    const suffix = event.slug.slice(-8).toUpperCase();
    await createVoucher({
      code: `CONG-${suffix}`,
      scope: "event",
      eventId: event.id,
      visibility: "public",
      totalUses: 5,
      eligibility: "allowlist",
      allowlist: ["rieng.tu@example.test"],
    });
    await createVoucher({
      code: `KIN-${suffix}`,
      scope: "event",
      eventId: event.id,
      visibility: "private",
    });
    const res = await t
      .http()
      .get(`/internal/v1/published-events/${event.slug}/vouchers`)
      .set("authorization", await web())
      .expect(200);
    const list = publicVoucherListSchema.parse(res.body);
    const own = list.items.find((item) => item.code === `CONG-${suffix}`);
    expect(own?.remaining).toBe(5);
    expect(list.items.some((item) => item.code === `KIN-${suffix}`)).toBe(false);
    expect(JSON.stringify(res.body)).not.toContain("rieng.tu@example.test");
  });
});

describe("back office", () => {
  it("needs voucher:write, and reports what a code brought in", async () => {
    await t
      .http()
      .get("/internal/v1/vouchers")
      .set("authorization", bearer(await t.staffToken(["content_editor"])))
      .expect(403);
    await t
      .http()
      .get("/internal/v1/vouchers")
      .set("authorization", bearer(await t.staffToken(["auditor"])))
      .expect(403);

    const { event, ticketTypeIds } = await priced();
    const code = `TK-${event.slug.slice(-8).toUpperCase()}`;
    const voucher = await createVoucher({ code, value: 100 });
    await book(t, {
      slug: event.slug,
      items: [{ ticketTypeId: ticketTypeIds[0]!, quantity: 1 }],
      buyer: buyer(),
      voucherCode: code,
    });
    const stats = await t
      .http()
      .get(`/internal/v1/orders/voucher-stats/${voucher.id}`)
      .set("authorization", await staff())
      .expect(200);
    expect(stats.body).toEqual({ paidOrders: 1, totalDiscount: 100_000, revenue: 0 });
  });

  it("freezes a used code, refuses a duplicate, and duplicates as paused", async () => {
    const { event, ticketTypeIds } = await priced();
    const code = `KHOA-${event.slug.slice(-8).toUpperCase()}`;
    const voucher = await createVoucher({ code, value: 100 });
    await book(t, {
      slug: event.slug,
      items: [{ ticketTypeId: ticketTypeIds[0]!, quantity: 1 }],
      buyer: buyer(),
      voucherCode: code,
    });
    const auth = await staff();
    const renamed = await t
      .http()
      .patch(`/internal/v1/vouchers/${voucher.id}`)
      .set("authorization", auth)
      .send({
        code: `${code}X`,
        name: "Đổi",
        discountType: "percent",
        value: 100,
        scope: "global",
        revision: voucher.revision,
      });
    expect(renamed.status).toBe(409);
    expect(renamed.body.code).toBe("voucher.locked");

    const twin = await t
      .http()
      .post("/internal/v1/vouchers")
      .set("authorization", auth)
      .send({ code, name: "Trùng", discountType: "percent", value: 5, scope: "global" });
    expect(twin.status).toBe(409);
    expect(twin.body.code).toBe("voucher.code_taken");

    const copy = await t
      .http()
      .post(`/internal/v1/vouchers/${voucher.id}/duplicate`)
      .set("authorization", auth)
      .expect(201);
    expect(voucherSchema.parse(copy.body)).toMatchObject({
      code: `${code}-COPY`,
      status: "paused",
      used: 0,
      held: 0,
    });
  });
});
