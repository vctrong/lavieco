import { createHmac, randomUUID } from "node:crypto";

import { Types } from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from "vitest";

import { REVALIDATE_HEADERS } from "@lavieco/shared";
import {
  eventListSchema,
  eventSchema,
  publicEventDetailSchema,
  publicEventListSchema,
  type EventView,
} from "@lavieco/shared/events";

import { bearer, createTestApp, drainOutbox, type TestApp } from "../support/test-app";

type CapturedCall = { url: string; headers: Record<string, string>; body: string };

let t: TestApp;
const revalidations: CapturedCall[] = [];
let workshopTypeId: string;

const DAY_MS = 86_400_000;
const inDays = (days: number, hours = 0) =>
  new Date(Date.now() + days * DAY_MS + hours * 3_600_000).toISOString();

beforeAll(async () => {
  t = await createTestApp(inject("mongoUri"), {
    revalidateFetch: async (url, init) => {
      revalidations.push({
        url: String(url),
        headers: init?.headers as Record<string, string>,
        body: String(init?.body),
      });
      return new Response(null, { status: 204 });
    },
  });
  const types = await t
    .http()
    .get("/internal/v1/event-types")
    .set("authorization", bearer(await t.staffToken(["coordinator"])));
  workshopTypeId = types.body.items.find((type: { key: string }) => type.key === "workshop").id;
});

afterAll(async () => {
  await t?.close();
});

beforeEach(() => {
  revalidations.length = 0;
});

const coordinator = async () => bearer(await t.staffToken(["coordinator"]));
const web = async () => bearer(await t.serviceToken("web"));

function details(overrides: Record<string, unknown> = {}) {
  return {
    title: "Workshop làm chậu cây từ bột vỏ sò",
    typeId: workshopTypeId,
    format: "offline",
    startAt: inDays(20),
    endAt: inDays(20, 3),
    venue: { name: "Xưởng LAVIECO", address: "Ninh Kiều, Cần Thơ" },
    summary: "Biến vỏ sò thành chậu cây.",
    ...overrides,
  };
}

async function createEvent(overrides: Record<string, unknown> = {}): Promise<EventView> {
  const res = await t
    .http()
    .post("/internal/v1/events")
    .set("authorization", await coordinator())
    .send(details(overrides))
    .expect(201);
  return eventSchema.parse(res.body);
}

async function addTicket(eventId: string, overrides: Record<string, unknown> = {}, status = 201) {
  return t
    .http()
    .post(`/internal/v1/events/${eventId}/ticket-types`)
    .set("authorization", await coordinator())
    .send({ name: "Vé tiêu chuẩn", price: 150_000, quantity: 20, maxPerOrder: 4, ...overrides })
    .expect(status);
}

async function getEvent(id: string): Promise<EventView> {
  const res = await t
    .http()
    .get(`/internal/v1/events/${id}`)
    .set("authorization", await coordinator())
    .expect(200);
  return eventSchema.parse(res.body);
}

async function act(id: string, action: string, revision: number) {
  return t
    .http()
    .post(`/internal/v1/events/${id}/status`)
    .set("authorization", await coordinator())
    .send({ action, revision });
}

async function readyAndPublished(overrides: Record<string, unknown> = {}) {
  const event = await createEvent(overrides);
  await addTicket(event.id);
  const res = await act(event.id, "publish", event.revision);
  expect(res.status).toBe(200);
  return eventSchema.parse(res.body);
}

describe("create → tickets → form → publish → public", () => {
  it("goes all the way and hides private fields from the public", async () => {
    const draft = await createEvent({
      onlineUrl: null,
      safetyNotes: "Có phát găng tay và khẩu trang.",
    });
    expect(draft).toMatchObject({ status: "draft", slug: "workshop-lam-chau-cay-tu-bot-vo-so" });
    expect(draft.readiness.blockers).toEqual(["ticket_type_missing"]);

    const notYet = await act(draft.id, "publish", draft.revision);
    expect(notYet.status).toBe(422);
    expect(notYet.body.code).toBe("event.not_publishable");

    await addTicket(draft.id);
    await addTicket(draft.id, { name: "Vé học sinh", price: 0, quantity: 5 });
    const questionId = randomUUID();
    const hiddenQuestionId = randomUUID();
    await t
      .http()
      .put(`/internal/v1/events/${draft.id}/form`)
      .set("authorization", await coordinator())
      .send({
        revision: draft.revision,
        questions: [
          { id: questionId, type: "paragraph", label: "Bạn mong đợi điều gì?", required: false },
          {
            id: hiddenQuestionId,
            type: "short_text",
            label: "Ẩn đi",
            required: false,
            hidden: true,
          },
        ],
      })
      .expect(200);

    const ready = await getEvent(draft.id);
    expect(ready.readiness.blockers).toEqual([]);
    expect(ready.pricing).toEqual({ isFree: true, priceFrom: 0 });

    // Not public while it is a draft.
    await t
      .http()
      .get(`/internal/v1/published-events/${ready.slug}`)
      .set("authorization", await web())
      .expect(404);

    const published = await act(ready.id, "publish", ready.revision);
    expect(published.status).toBe(200);
    expect(published.body.status).toBe("published");

    const detail = await t
      .http()
      .get(`/internal/v1/published-events/${ready.slug}`)
      .set("authorization", await web())
      .expect(200);
    const parsed = publicEventDetailSchema.parse(detail.body);
    expect(parsed.safetyNotes).toBe("Có phát găng tay và khẩu trang.");
    expect(parsed.ticketTypes).toHaveLength(2);
    // The checkout needs the visible questions; hidden ones never leave the service.
    expect(parsed.registration.questions.map((question) => question.id)).toEqual([questionId]);
    expect(parsed.registration).toMatchObject({ open: true, safetyAcknowledgementRequired: true });
    // The response carries nothing private, not even under another name.
    const raw = JSON.stringify(detail.body);
    for (const leak of [
      '"onlineUrl"',
      '"createdBy"',
      '"revision"',
      '"sold"',
      '"held"',
      '"hidden"',
      hiddenQuestionId,
    ]) {
      expect(raw).not.toContain(leak);
    }

    const list = await t
      .http()
      .get("/internal/v1/published-events?free=true")
      .set("authorization", await web())
      .expect(200);
    expect(publicEventListSchema.parse(list.body).items.map((card) => card.slug)).toContain(
      ready.slug,
    );
  });

  it("asks web to revalidate with a valid HMAC signature after publishing", async () => {
    const event = await readyAndPublished({ title: "Talkshow kiến trúc sinh học" });
    await drainOutbox(t);
    const call = revalidations.find((c) => c.body.includes(event.slug));
    expect(call).toBeDefined();
    expect(call!.url).toBe("http://web.test/api/revalidate");
    expect(JSON.parse(call!.body)).toEqual({
      tags: ["program:events", `program:events:${event.slug}`],
    });
    const timestamp = call!.headers[REVALIDATE_HEADERS.timestamp];
    const expected = createHmac("sha256", Buffer.from(t.env.REVALIDATE_SECRET, "base64"))
      .update(`${timestamp}.${call!.body}`)
      .digest("hex");
    expect(call!.headers[REVALIDATE_HEADERS.signature]).toBe(expected);
  });

  it("publishes an online event without link, flagged as a warning only", async () => {
    const event = await createEvent({
      title: "Workshop trực tuyến",
      format: "online",
      venue: null,
      onlineUrl: null,
    });
    await addTicket(event.id);
    const fresh = await getEvent(event.id);
    expect(fresh.readiness).toEqual({ blockers: [], warnings: ["online_url_missing"] });
    expect((await act(event.id, "publish", fresh.revision)).status).toBe(200);
  });
});

describe("lifecycle and BR-17 after registrations", () => {
  it("closes, reopens, ends; unpublish only without registrations", async () => {
    const event = await readyAndPublished({ title: "Nhuộm vải từ sắc tố thực vật" });
    const closed = await act(event.id, "close", event.revision);
    expect(closed.body.status).toBe("closed");
    const reopened = await act(event.id, "reopen", closed.body.revision);
    expect(reopened.body.status).toBe("published");
    const unpublished = await act(event.id, "unpublish", reopened.body.revision);
    expect(unpublished.body.status).toBe("draft");
    // The slug is frozen after the first publication, even back in draft.
    const renamed = await t
      .http()
      .put(`/internal/v1/events/${event.id}`)
      .set("authorization", await coordinator())
      .send({
        ...details({ title: event.title }),
        slug: "ten-moi",
        revision: unpublished.body.revision,
      })
      .expect(409);
    expect(renamed.body.code).toBe("event.slug_locked");

    const again = await act(event.id, "publish", unpublished.body.revision);
    const ended = await act(event.id, "end", again.body.revision);
    expect(ended.body.status).toBe("ended");
    expect((await act(event.id, "reopen", ended.body.revision)).body.code).toBe(
      "event.invalid_transition",
    );
  });

  it("refuses unpublishing, removing questions and repricing once a seat is held", async () => {
    const questionId = randomUUID();
    const event = await createEvent({ title: "Lớp gốm vỏ sò" });
    const ticket = await addTicket(event.id);
    await t
      .http()
      .put(`/internal/v1/events/${event.id}/form`)
      .set("authorization", await coordinator())
      .send({
        revision: event.revision,
        questions: [{ id: questionId, type: "paragraph", label: "Ghi chú", required: false }],
      })
      .expect(200);
    const fresh = await getEvent(event.id);
    const published = await act(event.id, "publish", fresh.revision);

    // Simulates a checkout hold (Phase 3).
    await t.db
      .collection("ticket_types")
      .updateOne({ _id: new Types.ObjectId(ticket.body.id) }, { $inc: { held: 1 } });

    const unpublish = await act(event.id, "unpublish", published.body.revision);
    expect(unpublish.status).toBe(409);
    expect(unpublish.body.code).toBe("event.has_registrations");

    const removed = await t
      .http()
      .put(`/internal/v1/events/${event.id}/form`)
      .set("authorization", await coordinator())
      .send({ revision: published.body.revision, questions: [] })
      .expect(409);
    expect(removed.body.code).toBe("event.form_locked");

    await t
      .http()
      .put(`/internal/v1/events/${event.id}/form`)
      .set("authorization", await coordinator())
      .send({
        revision: published.body.revision,
        questions: [
          { id: questionId, type: "paragraph", label: "Ghi chú", required: false, hidden: true },
          { id: randomUUID(), type: "short_text", label: "Câu mới", required: false },
        ],
      })
      .expect(200);

    const repriced = await t
      .http()
      .put(`/internal/v1/events/${event.id}/ticket-types/${ticket.body.id}`)
      .set("authorization", await coordinator())
      .send({ ...ticket.body, price: 99_000, revision: ticket.body.revision })
      .expect(409);
    expect(repriced.body.code).toBe("ticket_type.locked");
  });

  it("rejects a stale revision", async () => {
    const event = await createEvent({ title: "Bản cũ" });
    await t
      .http()
      .put(`/internal/v1/events/${event.id}`)
      .set("authorization", await coordinator())
      .send({ ...details({ title: "Bản mới" }), revision: event.revision })
      .expect(200);
    const stale = await t
      .http()
      .put(`/internal/v1/events/${event.id}`)
      .set("authorization", await coordinator())
      .send({ ...details({ title: "Bản khác" }), revision: event.revision })
      .expect(409);
    expect(stale.body.code).toBe("common.conflict");
  });
});

describe("duplicate, discard, slugs", () => {
  it("copies into a new draft with fresh counters and a free slug", async () => {
    const source = await readyAndPublished({ title: "Triển lãm Dấu chân phù sa" });
    await t.db
      .collection("ticket_types")
      .updateMany({ eventId: new Types.ObjectId(source.id) }, { $set: { sold: 7 } });

    const copy = await t
      .http()
      .post(`/internal/v1/events/${source.id}/duplicate`)
      .set("authorization", await coordinator())
      .expect(201);
    const parsed = eventSchema.parse(copy.body);
    expect(parsed).toMatchObject({
      status: "draft",
      slug: `${source.slug}-ban-sao`,
      title: "Triển lãm Dấu chân phù sa (bản sao)",
      hasRegistrations: false,
      publishedAt: null,
      slugLocked: false,
    });
    expect(parsed.ticketTypes.map((ticket) => [ticket.sold, ticket.held])).toEqual([[0, 0]]);

    const second = await t
      .http()
      .post(`/internal/v1/events/${source.id}/duplicate`)
      .set("authorization", await coordinator())
      .expect(201);
    expect(second.body.slug).toBe(`${source.slug}-ban-sao-2`);
  });

  it("refuses a slug already used, and frees it once the draft is discarded", async () => {
    const first = await createEvent({ title: "Chợ phiên tái chế", slug: "cho-phien-tai-che" });
    const clash = await t
      .http()
      .post("/internal/v1/events")
      .set("authorization", await coordinator())
      .send(details({ title: "Khác", slug: "cho-phien-tai-che" }))
      .expect(409);
    expect(clash.body.code).toBe("event.slug_taken");

    await t
      .http()
      .post(`/internal/v1/events/${first.id}/discard`)
      .set("authorization", await coordinator())
      .send({ revision: first.revision })
      .expect(204);
    await t
      .http()
      .get(`/internal/v1/events/${first.id}`)
      .set("authorization", await coordinator())
      .expect(404);
    await createEvent({ title: "Chợ phiên tái chế", slug: "cho-phien-tai-che" });
  });

  it("refuses discarding an event that was published", async () => {
    const event = await readyAndPublished({ title: "Đã từng lên sóng" });
    const back = await act(event.id, "unpublish", event.revision);
    const res = await t
      .http()
      .post(`/internal/v1/events/${event.id}/discard`)
      .set("authorization", await coordinator())
      .send({ revision: back.body.revision })
      .expect(409);
    expect(res.body.code).toBe("event.discard_not_allowed");
  });
});

describe("past events (archive only)", () => {
  it("publishes straight to ended, shows only in the past list, has no tickets", async () => {
    const past = await createEvent({
      title: "Workshop đầu tiên năm 2025",
      kind: "past",
      startAt: "2025-03-01T02:00:00.000Z",
      endAt: "2025-03-01T05:00:00.000Z",
    });
    expect(past.readiness.blockers).toEqual([]);
    const ticket = await addTicket(past.id, {}, 409);
    expect(ticket.body.code).toBe("event.past_event_restricted");

    const ended = await act(past.id, "publish", past.revision);
    expect(ended.body.status).toBe("ended");

    const upcoming = await t
      .http()
      .get("/internal/v1/published-events")
      .set("authorization", await web())
      .expect(200);
    expect(upcoming.body.items.map((card: { slug: string }) => card.slug)).not.toContain(past.slug);
    const archive = await t
      .http()
      .get("/internal/v1/published-events?scope=past&month=2025-03")
      .set("authorization", await web())
      .expect(200);
    expect(archive.body.items.map((card: { slug: string }) => card.slug)).toContain(past.slug);
  });

  it("cannot be created for an event that is not over yet", async () => {
    const running = await createEvent({ title: "Đang diễn ra", kind: "past" });
    expect(running.readiness.blockers).toEqual(["past_event_not_finished"]);
  });
});

describe("public availability", () => {
  it("hides seat counts for unlimited events and shows few seats and sold out", async () => {
    const unlimited = await createEvent({ title: "Triển lãm mở cửa tự do" });
    await addTicket(unlimited.id, { price: 0, quantity: null });
    await act(unlimited.id, "publish", unlimited.revision);
    const few = await createEvent({ title: "Lớp nhỏ tám chỗ" });
    const fewTicket = await addTicket(few.id, { quantity: 8 });
    await act(few.id, "publish", few.revision);

    const read = async (slug: string) =>
      publicEventDetailSchema.parse(
        (
          await t
            .http()
            .get(`/internal/v1/published-events/${slug}`)
            .set("authorization", await web())
            .expect(200)
        ).body,
      );
    expect((await read(unlimited.slug)).availability).toEqual({ soldOut: false, seatsLeft: null });
    expect((await read(few.slug)).availability).toEqual({ soldOut: false, seatsLeft: 8 });

    await t.db
      .collection("ticket_types")
      .updateOne({ _id: new Types.ObjectId(fewTicket.body.id) }, { $set: { sold: 8 } });
    expect((await read(few.slug)).availability).toEqual({ soldOut: true, seatsLeft: null });
  });
});

describe("preview", () => {
  it("shows a draft through a short-lived token only", async () => {
    const draft = await createEvent({
      title: "Bản nháp xem trước",
      onlineUrl: "https://meet.example/x",
    });
    const token = await t
      .http()
      .post(`/internal/v1/events/${draft.id}/preview-tokens`)
      .set("authorization", bearer(await t.staffToken(["auditor"])))
      .expect(201);
    const preview = await t
      .http()
      .get(`/internal/v1/event-previews/${token.body.token}`)
      .set("authorization", await web())
      .expect(200);
    expect(preview.body).toMatchObject({ status: "draft", title: "Bản nháp xem trước" });
    expect(JSON.stringify(preview.body)).not.toContain("meet.example");

    await t.db.collection("preview_tokens").updateMany({}, { $set: { expiresAt: new Date(0) } });
    await t
      .http()
      .get(`/internal/v1/event-previews/${token.body.token}`)
      .set("authorization", await web())
      .expect(404);
  });
});

describe("access rules on every route", () => {
  const id = new Types.ObjectId().toHexString();
  const routes: [method: "get" | "post" | "put", path: string, permission: "read" | "write"][] = [
    ["get", "/internal/v1/events", "read"],
    ["post", "/internal/v1/events", "write"],
    ["get", `/internal/v1/events/${id}`, "read"],
    ["put", `/internal/v1/events/${id}`, "write"],
    ["put", `/internal/v1/events/${id}/form`, "write"],
    ["post", `/internal/v1/events/${id}/status`, "write"],
    ["post", `/internal/v1/events/${id}/duplicate`, "write"],
    ["post", `/internal/v1/events/${id}/discard`, "write"],
    ["post", `/internal/v1/events/${id}/preview-tokens`, "read"],
    ["get", `/internal/v1/events/${id}/ticket-types`, "read"],
    ["post", `/internal/v1/events/${id}/ticket-types`, "write"],
    ["put", `/internal/v1/events/${id}/ticket-types/${id}`, "write"],
  ];

  it.each(routes)(
    "%s %s refuses members, services and missing permissions",
    async (method, path, permission) => {
      const call = () => t.http()[method](path);
      await call().expect(401);
      await call()
        .set("authorization", bearer(await t.memberToken()))
        .expect(401);
      await call()
        .set("authorization", await web())
        .expect(401);
      // Content editors and auditors only read events (docs/01 §4.4).
      if (permission === "write") {
        for (const role of ["content_editor", "auditor"] as const) {
          await call()
            .set("authorization", bearer(await t.staffToken([role])))
            .send({})
            .expect(403);
        }
      }
    },
  );

  it.each([
    "/internal/v1/published-events",
    "/internal/v1/published-events/some-slug",
    "/internal/v1/event-previews/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  ])("GET %s is for web only", async (path) => {
    await t
      .http()
      .get(path)
      .set("authorization", bearer(await t.serviceToken("admin")))
      .expect(403);
    await t
      .http()
      .get(path)
      .set("authorization", bearer(await t.staffToken(["super_admin"])))
      .expect(403);
  });

  it("lets the admin list count every status", async () => {
    const res = await t
      .http()
      .get("/internal/v1/events?limit=2")
      .set("authorization", bearer(await t.staffToken(["auditor"])))
      .expect(200);
    const list = eventListSchema.parse(res.body);
    expect(list.items).toHaveLength(2);
    expect(list.nextCursor).not.toBeNull();
    expect(list.counts.all).toBe(
      list.counts.draft + list.counts.published + list.counts.closed + list.counts.ended,
    );
    const next = await t
      .http()
      .get(`/internal/v1/events?limit=2&cursor=${list.nextCursor}`)
      .set("authorization", bearer(await t.staffToken(["auditor"])))
      .expect(200);
    expect(next.body.items[0].id).not.toBe(list.items[0]!.id);
  });
});
