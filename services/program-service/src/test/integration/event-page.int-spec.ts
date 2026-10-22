import { randomUUID } from "node:crypto";

import { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import {
  eventCancelImpactSchema,
  eventSchema,
  orderCreateResponseSchema,
  orderDetailSchema,
  publicEventAttendanceSchema,
  publicEventDetailSchema,
  publicEventListSchema,
} from "@lavieco/shared/events";
import type { AuditEventIngestRequest } from "@lavieco/shared/identity";

import { BUYER, book, inDays, publishedEvent } from "../support/fixtures";
import { bearer, createTestApp, drainOutbox, type TestApp } from "../support/test-app";

/**
 * Event page redesign (22/10/2026): public state and price range, the end-time split
 * between upcoming and past, cancelling an event, and the attendance figure (BR-09).
 */
let t: TestApp;
const audited: AuditEventIngestRequest[] = [];

beforeAll(async () => {
  t = await createTestApp(inject("mongoUri"), {
    auditSink: { send: async (event) => void audited.push(event) },
  });
});

afterAll(async () => {
  await t?.close();
});

const web = async () => bearer(await t.serviceToken("web"));
const coordinator = async () => bearer(await t.staffToken(["coordinator"]));

async function publicPage(slug: string) {
  const res = await t
    .http()
    .get(`/internal/v1/published-events/${slug}`)
    .set("authorization", await web())
    .expect(200);
  return publicEventDetailSchema.parse(res.body);
}

async function publicList(query: string) {
  const res = await t
    .http()
    .get(`/internal/v1/published-events?${query}`)
    .set("authorization", await web())
    .expect(200);
  return publicEventListSchema.parse(res.body);
}

async function attendance(slug: string) {
  const res = await t
    .http()
    .get(`/internal/v1/published-events/${slug}/attendance`)
    .set("authorization", await web())
    .expect(200);
  return publicEventAttendanceSchema.parse(res.body).attendeeCount;
}

async function adminEvent(id: string) {
  const res = await t
    .http()
    .get(`/internal/v1/events/${id}`)
    .set("authorization", await coordinator())
    .expect(200);
  return eventSchema.parse(res.body);
}

async function cancel(id: string, body: Record<string, unknown>) {
  const session = await t.staffSession(["coordinator"]);
  return t
    .http()
    .post(`/internal/v1/events/${id}/cancel`)
    .set("authorization", bearer(session.token))
    .set("x-step-up-token", await t.stepUpToken(session.userId, session.sessionId))
    .send(body);
}

describe("public state and price", () => {
  it("computes the badge on the server and gives the price range", async () => {
    const { event } = await publishedEvent(t, {
      tickets: [
        { price: 90_000, quantity: 10 },
        { price: 150_000, quantity: 10 },
      ],
    });
    const page = await publicPage(event.slug);
    expect(page.state).toBe("open");
    expect(page.price).toEqual({ min: 90_000, max: 150_000 });
    // A paid ticket next to a free one: not "free" (docs/03 §9.2, 22/10/2026).
    expect(page.pricing.isFree).toBe(false);

    await t.db
      .collection("ticket_types")
      .updateMany({ _id: { $in: page.ticketTypes.map((x) => new Types.ObjectId(x.id)) } }, [
        { $set: { sold: 8 } },
      ]);
    const few = await publicPage(event.slug);
    // 20 seats, 4 left: at most 20% → "Sắp hết chỗ", and only then the number.
    expect(few.state).toBe("few_left");
    expect(few.availability).toEqual({ soldOut: false, seatsLeft: 4 });
  });

  it("is free only when every visible ticket costs 0", async () => {
    const { event } = await publishedEvent(t, { tickets: [{ price: 0 }, { price: 0 }] });
    const page = await publicPage(event.slug);
    expect(page.pricing.isFree).toBe(true);
    const freeOnly = await publicList("scope=upcoming&free=true&limit=50");
    expect(freeOnly.items.map((item) => item.slug)).toContain(event.slug);
  });
});

describe("upcoming and past by end time", () => {
  it("moves an event whose end passed to the archive before anyone ends it", async () => {
    const { event } = await publishedEvent(t);
    await t.db
      .collection("events")
      .updateOne(
        { _id: new Types.ObjectId(event.id) },
        { $set: { startAt: new Date(inDays(-2)), endAt: new Date(inDays(-2, 3)) } },
      );
    const upcoming = await publicList("scope=upcoming&limit=50");
    const past = await publicList("scope=past&limit=50");
    expect(upcoming.items.map((item) => item.slug)).not.toContain(event.slug);
    expect(past.items.map((item) => item.slug)).toContain(event.slug);
    expect(past.items.find((item) => item.slug === event.slug)?.state).toBe("ended");
    expect(past.total).toBeGreaterThanOrEqual(1);
  });
});

describe("cancelling an event", () => {
  it("needs program:write and a step-up", async () => {
    const { event } = await publishedEvent(t);
    const body = { reason: "Người hướng dẫn bị ốm đột xuất", revision: event.revision };
    const editor = await t
      .http()
      .post(`/internal/v1/events/${event.id}/cancel`)
      .set("authorization", bearer(await t.staffToken(["content_editor"])))
      .send(body);
    expect(editor.status).toBe(403);
    const noStepUp = await t
      .http()
      .post(`/internal/v1/events/${event.id}/cancel`)
      .set("authorization", await coordinator())
      .send(body);
    expect(noStepUp.body.code).toBe("auth.step_up_required");
    const tooShort = await cancel(event.id, { reason: "Mưa", revision: event.revision });
    expect(tooShort.status).toBe(400);
  });

  it("voids tickets, flags paid amounts, cancels pending orders, emails buyers, audits", async () => {
    const { event, ticketTypeIds } = await publishedEvent(t, {
      tickets: [{ price: 120_000, quantity: 10 }],
    });
    const buyerPaid = { ...BUYER, email: "da.tra.tien@example.test" };
    const paidRes = await book(t, {
      slug: event.slug,
      items: [{ ticketTypeId: ticketTypeIds[0]!, quantity: 2 }],
      buyer: buyerPaid,
    });
    const paid = orderCreateResponseSchema.parse(paidRes.body);
    t.payments.statuses.set(paid.order.orderCode, {
      status: "PAID",
      amountPaid: 240_000,
      paymentLinkId: `link-${paid.order.orderCode}`,
      transactions: [
        { reference: "FT1", amount: 240_000, transactionDateTime: "2026-10-22 10:00:00" },
      ],
    });
    const paidId = (await t.db.collection("orders").findOne({ orderCode: paid.order.orderCode }))!
      ._id;
    await t
      .http()
      .post(`/internal/v1/orders/${paidId.toHexString()}/reconcile`)
      .set("authorization", await coordinator())
      .expect(200);
    const pendingRes = await book(t, {
      slug: event.slug,
      items: [{ ticketTypeId: ticketTypeIds[0]!, quantity: 1 }],
      buyer: { ...BUYER, email: "chua.tra@example.test" },
    });
    const pending = orderCreateResponseSchema.parse(pendingRes.body);
    await drainOutbox(t);

    const impact = eventCancelImpactSchema.parse(
      (
        await t
          .http()
          .get(`/internal/v1/events/${event.id}/cancel-impact`)
          .set("authorization", await coordinator())
          .expect(200)
      ).body,
    );
    expect(impact).toEqual({ paidOrders: 1, pendingOrders: 1, validTickets: 2 });

    const current = await adminEvent(event.id);
    const reason = "Người hướng dẫn bị ốm đột xuất, LAVIECO sẽ báo lịch mới.";
    const res = await cancel(event.id, { reason, revision: current.revision });
    expect(res.status).toBe(204);

    const after = await adminEvent(event.id);
    expect(after.status).toBe("cancelled");
    expect(after.cancellation?.reason).toBe(reason);

    const paidDetail = orderDetailSchema.parse(
      (
        await t
          .http()
          .get(`/internal/v1/orders/${paidId.toHexString()}`)
          .set("authorization", await coordinator())
          .expect(200)
      ).body,
    );
    expect(paidDetail.status).toBe("paid");
    expect(paidDetail.flags.refundRequired).toBe(true);
    expect(paidDetail.tickets.every((ticket) => ticket.status === "void")).toBe(true);

    const pendingDoc = await t.db
      .collection("orders")
      .findOne({ orderCode: pending.order.orderCode });
    expect(pendingDoc).toMatchObject({ status: "cancelled", seatState: "released" });
    const seats = await t.db
      .collection("ticket_types")
      .findOne({ _id: new Types.ObjectId(ticketTypeIds[0]) });
    expect(seats?.held).toBe(0);

    await drainOutbox(t);
    expect(t.payments.cancelled).toContain(pending.order.orderCode);
    const mails = t.emails.to(buyerPaid.email);
    expect(mails.at(-1)?.subject).toContain("Chương trình đã huỷ");
    expect(t.emails.to("chua.tra@example.test").some((m) => m.subject.includes("huỷ"))).toBe(false);
    expect(audited.some((entry) => entry.action === "event.cancel")).toBe(true);
    // No personal data in the logs (S7).
    expect(t.logs.join("\n")).not.toContain(buyerPaid.email);

    // Public page: cancelled with its reason; registration closed; final.
    const page = await publicPage(event.slug);
    expect(page.state).toBe("cancelled");
    expect(page.cancellation?.reason).toBe(reason);
    expect(page.registration.open).toBe(false);
    const again = await cancel(event.id, { reason, revision: after.revision });
    expect(again.status).toBe(409);
  });

  it("settles a payment arriving after the cancellation as refund only", async () => {
    const { event, ticketTypeIds } = await publishedEvent(t, {
      tickets: [{ price: 50_000, quantity: 5 }],
    });
    const created = orderCreateResponseSchema.parse(
      (
        await book(t, {
          slug: event.slug,
          items: [{ ticketTypeId: ticketTypeIds[0]!, quantity: 1 }],
          buyer: { ...BUYER, email: "tra.muon@example.test" },
        })
      ).body,
    );
    const current = await adminEvent(event.id);
    await cancel(event.id, { reason: "Thời tiết xấu, đóng cửa xưởng", revision: current.revision });

    t.payments.statuses.set(created.order.orderCode, {
      status: "PAID",
      amountPaid: 50_000,
      paymentLinkId: `link-${created.order.orderCode}`,
      transactions: [
        { reference: "FT2", amount: 50_000, transactionDateTime: "2026-10-22 11:00:00" },
      ],
    });
    const orderId = (await t.db
      .collection("orders")
      .findOne({ orderCode: created.order.orderCode }))!._id.toHexString();
    await t
      .http()
      .post(`/internal/v1/orders/${orderId}/reconcile`)
      .set("authorization", await coordinator())
      .expect(200);
    const order = await t.db.collection("orders").findOne({ orderCode: created.order.orderCode });
    expect(order).toMatchObject({
      status: "paid",
      seatState: "released",
      flags: { refundRequired: true },
    });
    expect(await t.db.collection("tickets").countDocuments({ orderId: order!._id })).toBe(0);
  });
});

describe("attendance (BR-09)", () => {
  it("publishes a typed archive count only once impact:approve approved it", async () => {
    const staff = await coordinator();
    const types = await t.http().get("/internal/v1/event-types").set("authorization", staff);
    const typeId = types.body.items.find((type: { key: string }) => type.key === "workshop").id;
    const created = eventSchema.parse(
      (
        await t
          .http()
          .post("/internal/v1/events")
          .set("authorization", staff)
          .send({
            kind: "past",
            title: `Lớp thí điểm ${randomUUID().slice(0, 6)}`,
            typeId,
            format: "offline",
            startAt: inDays(-30),
            endAt: inDays(-30, 2),
            venue: { name: "Trường tiểu học", address: "Ninh Kiều, Cần Thơ" },
            attendanceCount: 96,
          })
          .expect(201)
      ).body,
    );
    expect(created.attendance).toMatchObject({ count: 96, approvedAt: null });
    const published = eventSchema.parse(
      (
        await t
          .http()
          .post(`/internal/v1/events/${created.id}/status`)
          .set("authorization", staff)
          .send({ action: "publish", revision: created.revision })
          .expect(200)
      ).body,
    );
    expect(await attendance(published.slug)).toBeNull();

    const byCoordinator = await t
      .http()
      .post(`/internal/v1/events/${published.id}/attendance/approve`)
      .set("authorization", staff)
      .send({ revision: published.revision });
    expect(byCoordinator.status).toBe(403);

    const approved = eventSchema.parse(
      (
        await t
          .http()
          .post(`/internal/v1/events/${published.id}/attendance/approve`)
          .set("authorization", bearer(await t.staffToken(["super_admin"])))
          .send({ revision: published.revision })
          .expect(200)
      ).body,
    );
    expect(approved.attendance.approvedAt).not.toBeNull();
    expect(await attendance(published.slug)).toBe(96);
    await drainOutbox(t);
    expect(audited.some((entry) => entry.action === "event.attendance_approve")).toBe(true);
  });

  it("counts checked-in tickets for an event that has ended", async () => {
    const { event, ticketTypeIds } = await publishedEvent(t);
    const created = orderCreateResponseSchema.parse(
      (
        await book(t, {
          slug: event.slug,
          items: [{ ticketTypeId: ticketTypeIds[0]!, quantity: 3 }],
          buyer: { ...BUYER, email: "tham.gia@example.test" },
        })
      ).body,
    );
    expect(await attendance(event.slug)).toBeNull();
    for (const ticket of created.order.tickets.slice(0, 2)) {
      await t
        .http()
        .post("/internal/v1/checkins")
        .set("authorization", await coordinator())
        .send({ eventId: event.id, qrToken: ticket.qrToken })
        .expect(200);
    }
    await t.db
      .collection("events")
      .updateOne(
        { _id: new Types.ObjectId(event.id) },
        { $set: { startAt: new Date(inDays(-1)), endAt: new Date(inDays(-1, 2)) } },
      );
    expect(await attendance(event.slug)).toBe(2);
  });
});

describe("access rules of the new routes", () => {
  const id = new Types.ObjectId().toHexString();
  it.each([
    ["get", `/internal/v1/events/${id}/cancel-impact`],
    ["post", `/internal/v1/events/${id}/cancel`],
    ["post", `/internal/v1/events/${id}/attendance/approve`],
  ] as const)("%s %s refuses members, services and auditors", async (method, path) => {
    const call = () => t.http()[method](path);
    await call().expect(401);
    await call()
      .set("authorization", bearer(await t.memberToken()))
      .expect(401);
    await call()
      .set("authorization", await web())
      .expect(401);
    await call()
      .set("authorization", bearer(await t.staffToken(["auditor"])))
      .send({})
      .expect(403);
  });

  it("serves the attendance figure to web only", async () => {
    await t.http().get("/internal/v1/published-events/some-slug/attendance").expect(401);
    await t
      .http()
      .get("/internal/v1/published-events/some-slug/attendance")
      .set("authorization", await coordinator())
      .expect(403);
  });
});
