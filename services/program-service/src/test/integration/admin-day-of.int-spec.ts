import { randomUUID } from "node:crypto";

import ExcelJS from "exceljs";
import { mongo } from "mongoose";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import {
  checkinResponseSchema,
  orderCreateResponseSchema,
  orderDetailSchema,
  orderListSchema,
  registrationListSchema,
} from "@lavieco/shared/events";
import type { AuditEventIngestRequest } from "@lavieco/shared/identity";

import { BUYER, book, publishedEvent } from "../support/fixtures";
import { bearer, createTestApp, drainOutbox, type TestApp } from "../support/test-app";

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

const coordinator = async () => bearer(await t.staffToken(["coordinator"]));

async function freeOrder(quantity = 1, buyer = BUYER) {
  const { event, ticketTypeIds } = await publishedEvent(t, {
    questions: [
      { id: randomUUID(), type: "short_text", label: "Bạn đến từ đâu?", required: false },
    ],
  });
  const res = await book(t, {
    slug: event.slug,
    items: [{ ticketTypeId: ticketTypeIds[0]!, quantity }],
    buyer,
  });
  expect(res.status).toBe(201);
  return {
    event,
    ticketTypeId: ticketTypeIds[0]!,
    created: orderCreateResponseSchema.parse(res.body),
  };
}

async function scan(body: Record<string, unknown>, token?: string) {
  return t
    .http()
    .post("/internal/v1/checkins")
    .set("authorization", token ?? (await coordinator()))
    .send(body);
}

describe("check-in at the door (BR-16)", () => {
  it("answers valid once, then 'already checked in at …' for the same QR or typed code", async () => {
    const { event, created } = await freeOrder(2);
    const [ticket] = created.order.tickets;

    const first = checkinResponseSchema.parse(
      (await scan({ eventId: event.id, qrToken: ticket!.qrToken })).body,
    );
    expect(first).toMatchObject({
      result: "valid",
      ticket: { code: ticket!.code, buyerName: BUYER.fullName },
      stats: { checkedIn: 1, total: 2 },
    });

    const again = checkinResponseSchema.parse(
      (await scan({ eventId: event.id, qrToken: ticket!.qrToken })).body,
    );
    expect(again.result).toBe("already_used");
    expect(again.ticket?.checkedInAt).toBe(first.ticket?.checkedInAt);

    const typed = await scan({ eventId: event.id, code: ticket!.code.toLowerCase() });
    expect(typed.status).toBe(200);
    expect(typed.body.result).toBe("already_used");
  });

  it("lets only one of two simultaneous scans check the ticket in", async () => {
    const { event, created } = await freeOrder(1);
    const qrToken = created.order.tickets[0]!.qrToken;
    const results = await Promise.all([
      scan({ eventId: event.id, qrToken }),
      scan({ eventId: event.id, qrToken }),
    ]);
    expect(results.map((res) => res.body.result).sort()).toEqual(["already_used", "valid"]);
  });

  it("answers invalid for another event's ticket or an unknown QR", async () => {
    const { created } = await freeOrder(1);
    const other = await publishedEvent(t);
    const wrongEvent = await scan({
      eventId: other.event.id,
      qrToken: created.order.tickets[0]!.qrToken,
    });
    expect(wrongEvent.body).toMatchObject({ result: "invalid", ticket: null });
    const unknown = await scan({ eventId: other.event.id, qrToken: "x".repeat(43) });
    expect(unknown.body.result).toBe("invalid");
  });

  it("needs checkin:perform", async () => {
    const { event, created } = await freeOrder(1);
    const res = await scan(
      { eventId: event.id, qrToken: created.order.tickets[0]!.qrToken },
      bearer(await t.staffToken(["content_editor"])),
    );
    expect(res.status).toBe(403);
  });
});

describe("registrations and Excel export (step-up + audit)", () => {
  it("lists one row per ticket with a column per question, hidden ones included", async () => {
    const { event } = await freeOrder(2);
    const res = await t
      .http()
      .get(`/internal/v1/events/${event.id}/registrations`)
      .set("authorization", await coordinator())
      .expect(200);
    const list = registrationListSchema.parse(res.body);
    expect(list.items).toHaveLength(2);
    expect(list.columns.map((column) => column.label)).toEqual(["Bạn đến từ đâu?"]);
  });

  it("refuses the export without a step-up of the same session", async () => {
    const { event } = await freeOrder(1);
    const session = await t.staffSession(["coordinator"]);
    const missing = await t
      .http()
      .get(`/internal/v1/events/${event.id}/registrations/export`)
      .set("authorization", bearer(session.token));
    expect(missing.status).toBe(403);
    expect(missing.body.code).toBe("auth.step_up_required");

    const otherSession = await t
      .http()
      .get(`/internal/v1/events/${event.id}/registrations/export`)
      .set("authorization", bearer(session.token))
      .set("x-step-up-token", await t.stepUpToken(session.userId, randomUUID()));
    expect(otherSession.body.code).toBe("auth.step_up_required");

    const editor = await t.staffSession(["content_editor"]);
    const noPermission = await t
      .http()
      .get(`/internal/v1/events/${event.id}/registrations/export`)
      .set("authorization", bearer(editor.token))
      .set("x-step-up-token", await t.stepUpToken(editor.userId, editor.sessionId));
    expect(noPermission.status).toBe(403);
    expect(noPermission.body.code).toBe("common.forbidden");
  });

  it("exports an .xlsx with a bold frozen header, formulas neutralised, and audits it", async () => {
    const { event } = await freeOrder(1, {
      ...BUYER,
      fullName: '=HYPERLINK("http://evil.example","bam")',
      email: "cong.thuc@example.test",
    });
    const session = await t.staffSession(["coordinator"]);
    const res = await t
      .http()
      .get(`/internal/v1/events/${event.id}/registrations/export`)
      .set("authorization", bearer(session.token))
      .set("x-step-up-token", await t.stepUpToken(session.userId, session.sessionId))
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => callback(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("spreadsheetml");
    expect(res.headers["content-disposition"]).toMatch(
      new RegExp(`LAVIECO_${event.slug}_\\d{4}-\\d{2}-\\d{2}\\.xlsx`),
    );

    const workbook = new ExcelJS.Workbook();
    const bytes = res.body as Buffer;
    await workbook.xlsx.load(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    );
    const sheet = workbook.worksheets[0]!;
    expect(sheet.getRow(1).getCell(2).value).toBe("Họ tên");
    expect(sheet.getRow(1).font?.bold).toBe(true);
    expect(sheet.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    expect(String(sheet.getRow(2).getCell(2).value)).toBe(
      `'=HYPERLINK("http://evil.example","bam")`,
    );
    expect(sheet.getRow(1).getCell(11).value).toBe("Bạn đến từ đâu?");

    await drainOutbox(t);
    const event1 = audited.find(
      (entry) => entry.action === "registration.export" && entry.target?.id === event.id,
    );
    expect(event1).toMatchObject({
      actor: { userId: session.userId, roles: ["coordinator"] },
      meta: { rows: 1 },
    });
    expect(JSON.stringify(event1)).not.toContain("cong.thuc@example.test");
  });
});

describe("orders in admin", () => {
  it("lists, shows and resends; marks refunded only with step-up, once", async () => {
    const { event, ticketTypeId, created } = await freeOrder(2, {
      ...BUYER,
      email: "hoan.tien@example.test",
    });
    const staff = await coordinator();
    const list = orderListSchema.parse(
      (
        await t
          .http()
          .get(`/internal/v1/orders?eventId=${event.id}`)
          .set("authorization", staff)
          .expect(200)
      ).body,
    );
    expect(list.items).toHaveLength(1);
    const orderId = list.items[0]!.id;
    const detail = orderDetailSchema.parse(
      (await t.http().get(`/internal/v1/orders/${orderId}`).set("authorization", staff).expect(200))
        .body,
    );
    expect(detail.tickets).toHaveLength(2);

    await drainOutbox(t);
    await t
      .http()
      .post(`/internal/v1/orders/${orderId}/resend-tickets`)
      .set("authorization", staff)
      .expect(204);
    await drainOutbox(t);
    expect(t.emails.to("hoan.tien@example.test")).toHaveLength(2);

    const session = await t.staffSession(["coordinator"]);
    const body = {
      revision: detail.revision,
      note: "Đã chuyển khoản lại 0đ (chương trình miễn phí)",
    };
    const noStepUp = await t
      .http()
      .post(`/internal/v1/orders/${orderId}/refund`)
      .set("authorization", bearer(session.token))
      .send(body);
    expect(noStepUp.body.code).toBe("auth.step_up_required");

    const stepUp = await t.stepUpToken(session.userId, session.sessionId);
    const refunded = await t
      .http()
      .post(`/internal/v1/orders/${orderId}/refund`)
      .set("authorization", bearer(session.token))
      .set("x-step-up-token", stepUp)
      .send(body)
      .expect(200);
    expect(refunded.body.status).toBe("refunded");
    expect(refunded.body.tickets.map((ticket: { status: string }) => ticket.status)).toEqual([
      "void",
      "void",
    ]);
    const seats = await t.db
      .collection("ticket_types")
      .findOne({ _id: new mongo.ObjectId(ticketTypeId) });
    expect(seats).toMatchObject({ sold: 0, held: 0 });

    const twice = await t
      .http()
      .post(`/internal/v1/orders/${orderId}/refund`)
      .set("authorization", bearer(session.token))
      .set("x-step-up-token", stepUp)
      .send({ ...body, revision: refunded.body.revision });
    expect(twice.status).toBe(409);

    // A refunded ticket no longer gets in.
    const door = await scan({ eventId: event.id, qrToken: created.order.tickets[0]!.qrToken });
    expect(door.body.result).toBe("invalid");

    await drainOutbox(t);
    expect(
      audited.some((entry) => entry.action === "order.refund" && entry.target?.id === orderId),
    ).toBe(true);
  });

  it("needs order:refund to mark a refund and order:read to see orders", async () => {
    const editor = await t.staffSession(["content_editor"]);
    await t
      .http()
      .get("/internal/v1/orders")
      .set("authorization", bearer(editor.token))
      .expect(403);
    const auditor = await t.staffSession(["auditor"]);
    await t
      .http()
      .get("/internal/v1/orders")
      .set("authorization", bearer(auditor.token))
      .expect(200);
    const res = await t
      .http()
      .post(`/internal/v1/orders/${"a".repeat(24)}/refund`)
      .set("authorization", bearer(auditor.token))
      .set("x-step-up-token", await t.stepUpToken(auditor.userId, auditor.sessionId))
      .send({ revision: 1, note: "x" });
    expect(res.status).toBe(403);
  });

  it("filters the orders that need a manual refund", async () => {
    const res = await t
      .http()
      .get("/internal/v1/orders?flag=refund_required")
      .set("authorization", await coordinator())
      .expect(200);
    expect(orderListSchema.parse(res.body).items.every((item) => item.flags.refundRequired)).toBe(
      true,
    );
  });
});
