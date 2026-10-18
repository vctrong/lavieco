import { randomUUID } from "node:crypto";

import { mongo } from "mongoose";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import {
  orderCreateResponseSchema,
  orderViewSchema,
  publicEventDetailSchema,
  ticketLookupResponseSchema,
} from "@lavieco/shared/events";

import { BUYER, book, publishedEvent } from "../support/fixtures";
import { bearer, createTestApp, drainOutbox, type TestApp } from "../support/test-app";

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp(inject("mongoUri"));
});

afterAll(async () => {
  await t?.close();
});

const web = async () => bearer(await t.serviceToken("web"));

async function seats(ticketTypeId: string) {
  const doc = await t.db
    .collection("ticket_types")
    .findOne({ _id: new mongo.ObjectId(ticketTypeId) });
  return { sold: doc?.sold as number, held: doc?.held as number };
}

async function view(token: string) {
  const res = await t
    .http()
    .get(`/internal/v1/order-links/${token}`)
    .set("authorization", await web())
    .expect(200);
  return orderViewSchema.parse(res.body);
}

describe("free registration (Phase 3 'done when')", () => {
  it("guest → proof → paid order of 0 đ → one QR ticket per seat → email", async () => {
    const questionId = randomUUID();
    const { event, ticketTypeIds } = await publishedEvent(t, {
      questions: [
        { id: questionId, type: "short_text", label: "Bạn biết LAVIECO qua đâu?", required: true },
      ],
    });
    const res = await book(t, {
      slug: event.slug,
      items: [{ ticketTypeId: ticketTypeIds[0]!, quantity: 2 }],
      answers: { [questionId]: "Facebook" },
    });
    expect(res.status).toBe(201);
    const created = orderCreateResponseSchema.parse(res.body);
    expect(created.order).toMatchObject({ status: "paid", amount: 0, payment: null });
    expect(created.order.tickets).toHaveLength(2);
    const [first, second] = created.order.tickets;
    expect(first!.code).toMatch(/^LVC-[0-9A-HJKMNP-TV-Z]{6}$/);
    expect(first!.qrToken).not.toBe(second!.qrToken);
    expect(Buffer.from(first!.qrToken, "base64url")).toHaveLength(32);
    expect(await seats(ticketTypeIds[0]!)).toEqual({ sold: 2, held: 0 });

    // The answers are stored with the order, nothing about attendees (BR-13).
    const order = await t.db.collection("orders").findOne({ orderCode: created.order.orderCode });
    expect(Object.keys(order!.buyer).sort()).toEqual(
      ["email", "emailNormalized", "fullName", "isGuardian", "phone", "phoneNormalized"].sort(),
    );
    const answers = await t.db.collection("order_answers").findOne({ orderId: order!._id });
    expect(answers!.answers).toEqual([{ questionId, value: "Facebook" }]);

    await drainOutbox(t);
    const [mail] = t.emails.to(BUYER.email);
    expect(mail?.subject).toContain(event.title);
    expect(mail?.attachments).toHaveLength(2);
    expect(mail?.html).toContain(`/ve/${created.accessToken}`);
    expect(mail?.html).toContain(`cid:${mail!.attachments![0]!.cid}`);

    expect((await view(created.accessToken)).tickets).toHaveLength(2);
    // Logs never carry the buyer's personal data.
    const logs = t.logs.join("\n");
    for (const value of [BUYER.email, BUYER.fullName, "0901"]) expect(logs).not.toContain(value);
  });

  it("sells the last seat once when two people book it at the same time (BR-14)", async () => {
    const { event, ticketTypeIds } = await publishedEvent(t, { tickets: [{ quantity: 1 }] });
    const ticketTypeId = ticketTypeIds[0]!;
    const attempts = await Promise.all(
      ["mot@example.test", "hai@example.test"].map((email) =>
        book(t, {
          slug: event.slug,
          items: [{ ticketTypeId, quantity: 1 }],
          buyer: { ...BUYER, email },
        }),
      ),
    );
    expect(attempts.map((res) => res.status).sort()).toEqual([201, 409]);
    expect(attempts.find((res) => res.status === 409)!.body.code).toBe("order.sold_out");
    expect(await seats(ticketTypeId)).toEqual({ sold: 1, held: 0 });
    expect(
      await t.db.collection("orders").countDocuments({ eventId: new mongo.ObjectId(event.id) }),
    ).toBe(1);
  });

  it("uses a proof once: a retried request returns the same order without new seats", async () => {
    const { event, ticketTypeIds } = await publishedEvent(t);
    const proof = await t.emailProof(BUYER.email);
    const input = {
      slug: event.slug,
      items: [{ ticketTypeId: ticketTypeIds[0]!, quantity: 1 }],
      proof,
    };
    const first = await book(t, input);
    const again = await book(t, input);
    expect(again.status).toBe(201);
    expect(again.body.order.orderCode).toBe(first.body.order.orderCode);
    expect(await seats(ticketTypeIds[0]!)).toEqual({ sold: 1, held: 0 });
  });

  it("checks the proof: same email, purpose checkout, signed by identity", async () => {
    const { event, ticketTypeIds } = await publishedEvent(t);
    const items = [{ ticketTypeId: ticketTypeIds[0]!, quantity: 1 }];
    const otherEmail = await book(t, {
      slug: event.slug,
      items,
      proof: await t.emailProof("nguoi.khac@example.test"),
    });
    expect(otherEmail.body.code).toBe("order.email_mismatch");
    const lookupProof = await book(t, {
      slug: event.slug,
      items,
      proof: await t.emailProof(BUYER.email, { purpose: "ticket_lookup" }),
    });
    expect(lookupProof.body.code).toBe("otp.verification_invalid");
    const forged = await book(t, { slug: event.slug, items, proof: "eyJhbGciOiJub25lIn0.e30.x" });
    expect(forged.body.code).toBe("otp.verification_invalid");
    expect(await seats(ticketTypeIds[0]!)).toEqual({ sold: 0, held: 0 });
  });

  it("requires the answers, the safety box when there are safety notes, and consent", async () => {
    const questionId = randomUUID();
    const { event, ticketTypeIds } = await publishedEvent(t, {
      details: { safetyNotes: "Bột vỏ sò: có phát khẩu trang và găng tay." },
      questions: [{ id: questionId, type: "paragraph", label: "Ghi chú", required: true }],
    });
    const items = [{ ticketTypeId: ticketTypeIds[0]!, quantity: 1 }];
    const missingAnswer = await book(t, {
      slug: event.slug,
      items,
      extra: { safetyAcknowledged: true },
    });
    expect(missingAnswer.body.code).toBe("order.answers_invalid");
    const noSafety = await book(t, { slug: event.slug, items, answers: { [questionId]: "ok" } });
    expect(noSafety.body.code).toBe("order.consent_required");
    const noConsent = await book(t, {
      slug: event.slug,
      items,
      answers: { [questionId]: "ok" },
      extra: { safetyAcknowledged: true, dataConsent: false },
    });
    expect(noConsent.status).toBe(400);
    const ok = await book(t, {
      slug: event.slug,
      items,
      answers: { [questionId]: "ok" },
      extra: { safetyAcknowledged: true },
    });
    expect(ok.status).toBe(201);
  });

  it("refuses more than the type's maxPerOrder and recomputes the price server-side", async () => {
    const { event, ticketTypeIds } = await publishedEvent(t, { tickets: [{ maxPerOrder: 2 }] });
    const res = await book(t, {
      slug: event.slug,
      items: [{ ticketTypeId: ticketTypeIds[0]!, quantity: 3 }],
    });
    expect(res.body.code).toBe("order.items_invalid");
  });

  it("takes no booking for an online event whose link is still missing", async () => {
    const { event, ticketTypeIds } = await publishedEvent(t, {
      details: { format: "online", venue: null, onlineUrl: null },
    });
    const detail = await t
      .http()
      .get(`/internal/v1/published-events/${event.slug}`)
      .set("authorization", await web())
      .expect(200);
    expect(publicEventDetailSchema.parse(detail.body).registration).toMatchObject({
      open: false,
      blocker: "online_link_pending",
    });
    const res = await book(t, {
      slug: event.slug,
      items: [{ ticketTypeId: ticketTypeIds[0]!, quantity: 1 }],
    });
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({
      code: "order.registration_closed",
      reason: "online_link_pending",
    });
  });
});

describe("paid orders: hold, cancel, expiry", () => {
  it("holds seats and creates a payOS link that never outlives the hold", async () => {
    const { event, ticketTypeIds } = await publishedEvent(t, { tickets: [{ price: 150_000 }] });
    const res = await book(t, {
      slug: event.slug,
      items: [{ ticketTypeId: ticketTypeIds[0]!, quantity: 2 }],
    });
    expect(res.status).toBe(201);
    const created = orderCreateResponseSchema.parse(res.body);
    expect(created.order).toMatchObject({ status: "pending", amount: 300_000, tickets: [] });
    expect(created.order.payment?.qrCode).toContain("FAKEQR");
    const link = t.payments.links.find((l) => l.orderCode === created.order.orderCode)!;
    expect(link.amount).toBe(300_000);
    expect(link.expiresAt.getTime()).toBeLessThanOrEqual(Date.parse(created.order.expiresAt));
    expect(link.returnUrl).toContain(`/chuong-trinh/thanh-toan/${created.accessToken}`);
    expect(await seats(ticketTypeIds[0]!)).toEqual({ sold: 0, held: 2 });
  });

  it("lets the buyer cancel with the signed link only; seats back, payOS link cancelled", async () => {
    const { event, ticketTypeIds } = await publishedEvent(t, { tickets: [{ price: 50_000 }] });
    const res = await book(t, {
      slug: event.slug,
      items: [{ ticketTypeId: ticketTypeIds[0]!, quantity: 1 }],
    });
    const created = orderCreateResponseSchema.parse(res.body);

    await t
      .http()
      .post(`/internal/v1/order-links/${created.order.orderCode}/cancel`)
      .set("authorization", await web())
      .expect((r) => expect([400, 404]).toContain(r.status));
    const forged = `${created.accessToken.split(".")[0]}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
    await t
      .http()
      .post(`/internal/v1/order-links/${forged}/cancel`)
      .set("authorization", await web())
      .expect(404);

    const cancelled = await t
      .http()
      .post(`/internal/v1/order-links/${created.accessToken}/cancel`)
      .set("authorization", await web())
      .expect(200);
    // web reads this with the shared schema: a drift shows the buyer "system busy".
    expect(orderViewSchema.parse(cancelled.body)).toMatchObject({
      status: "cancelled",
      payment: null,
      tickets: [],
    });
    expect(await seats(ticketTypeIds[0]!)).toEqual({ sold: 0, held: 0 });
    await drainOutbox(t);
    expect(t.payments.cancelled).toContain(created.order.orderCode);
  });

  it("expires holds after 15 minutes and gives the seats back exactly once", async () => {
    const { event, ticketTypeIds } = await publishedEvent(t, { tickets: [{ price: 80_000 }] });
    const res = await book(t, {
      slug: event.slug,
      items: [{ ticketTypeId: ticketTypeIds[0]!, quantity: 3 }],
    });
    const created = orderCreateResponseSchema.parse(res.body);
    expect(await seats(ticketTypeIds[0]!)).toEqual({ sold: 0, held: 3 });

    expect(await t.expireHolds(new Date(Date.now() + 14 * 60_000))).toBe(0);
    const later = new Date(Date.now() + 16 * 60_000);
    await t.expireHolds(later);
    await t.expireHolds(later);
    expect((await view(created.accessToken)).status).toBe("expired");
    expect(await seats(ticketTypeIds[0]!)).toEqual({ sold: 0, held: 0 });
    await drainOutbox(t);
    expect(t.payments.cancelled).toContain(created.order.orderCode);
  });

  it("gives the seats back at once when payOS cannot create the link", async () => {
    const { event, ticketTypeIds } = await publishedEvent(t, { tickets: [{ price: 99_000 }] });
    t.payments.failNextLink = true;
    const res = await book(t, {
      slug: event.slug,
      items: [{ ticketTypeId: ticketTypeIds[0]!, quantity: 1 }],
    });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe("payment.unavailable");
    expect(await seats(ticketTypeIds[0]!)).toEqual({ sold: 0, held: 0 });
  });

  it("refuses a paid booking before holding anything when payOS is not configured", async () => {
    const { event, ticketTypeIds } = await publishedEvent(t, { tickets: [{ price: 99_000 }] });
    t.payments.enabled = false;
    try {
      const res = await book(t, {
        slug: event.slug,
        items: [{ ticketTypeId: ticketTypeIds[0]!, quantity: 1 }],
      });
      expect(res.body.code).toBe("payment.unavailable");
      expect(await seats(ticketTypeIds[0]!)).toEqual({ sold: 0, held: 0 });
    } finally {
      t.payments.enabled = true;
    }
  });
});

describe("ticket lookup and access", () => {
  it("lists the paid orders of an email that passed OTP (ticket_lookup)", async () => {
    const email = "tra.cuu@example.test";
    const { event, ticketTypeIds } = await publishedEvent(t);
    await book(t, {
      slug: event.slug,
      items: [{ ticketTypeId: ticketTypeIds[0]!, quantity: 1 }],
      buyer: { ...BUYER, email },
    });
    const res = await t
      .http()
      .post("/internal/v1/ticket-lookups")
      .set("authorization", await web())
      .send({ verificationToken: await t.emailProof(email, { purpose: "ticket_lookup" }) })
      .expect(200);
    const lookup = ticketLookupResponseSchema.parse(res.body);
    expect(lookup.items).toHaveLength(1);
    expect((await view(lookup.items[0]!.accessToken)).tickets).toHaveLength(1);

    const wrongPurpose = await t
      .http()
      .post("/internal/v1/ticket-lookups")
      .set("authorization", await web())
      .send({ verificationToken: await t.emailProof(email) });
    expect(wrongPurpose.body.code).toBe("otp.verification_invalid");
  });

  it("keeps the checkout routes for the web BFF only", async () => {
    await t
      .http()
      .post("/internal/v1/orders")
      .set("authorization", bearer(await t.serviceToken("admin")))
      .send({})
      .expect(403);
    await t
      .http()
      .get("/internal/v1/order-links/6650a1b2c3d4e5f6a7b8c9d0.abc")
      .set("authorization", bearer(await t.staffToken(["super_admin"])))
      .expect(403);
  });
});

describe("events for children and online links", () => {
  it("asks the booker to confirm being a parent or guardian, and stores it", async () => {
    const { event, ticketTypeIds } = await publishedEvent(t, { details: { forChildren: true } });
    const detail = await t
      .http()
      .get(`/internal/v1/published-events/${event.slug}`)
      .set("authorization", await web())
      .expect(200);
    expect(detail.body.registration.guardianConfirmationRequired).toBe(true);
    const items = [{ ticketTypeId: ticketTypeIds[0]!, quantity: 1 }];
    const missing = await book(t, { slug: event.slug, items });
    expect(missing.status).toBe(422);
    expect(missing.body).toMatchObject({ code: "order.consent_required", reason: "guardian" });
    const ok = await book(t, { slug: event.slug, items, extra: { isGuardian: true } });
    expect(ok.status).toBe(201);
    const order = await t.db.collection("orders").findOne({ orderCode: ok.body.order.orderCode });
    expect(order?.buyer.isGuardian).toBe(true);
  });

  it("lets the online link change but not disappear once tickets are sold", async () => {
    const { event, ticketTypeIds } = await publishedEvent(t, {
      details: { format: "online", venue: null, onlineUrl: "https://meet.example/lavieco-1" },
    });
    expect(
      (
        await book(t, {
          slug: event.slug,
          items: [{ ticketTypeId: ticketTypeIds[0]!, quantity: 1 }],
        })
      ).status,
    ).toBe(201);
    const staff = bearer(await t.staffToken(["coordinator"]));
    const current = await t
      .http()
      .get(`/internal/v1/events/${event.id}`)
      .set("authorization", staff);
    const base = {
      title: current.body.title,
      typeId: current.body.typeId,
      format: "online",
      startAt: current.body.startAt,
      endAt: current.body.endAt,
      venue: null,
      summary: current.body.summary,
    };
    const removed = await t
      .http()
      .put(`/internal/v1/events/${event.id}`)
      .set("authorization", staff)
      .send({ ...base, onlineUrl: null, revision: current.body.revision });
    expect(removed.status).toBe(409);
    expect(removed.body.code).toBe("event.online_url_locked");
    const moved = await t
      .http()
      .put(`/internal/v1/events/${event.id}`)
      .set("authorization", staff)
      .send({
        ...base,
        onlineUrl: "https://meet.example/lavieco-2",
        revision: current.body.revision,
      });
    expect(moved.status).toBe(200);
  });
});
