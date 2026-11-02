import { mongo } from "mongoose";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import {
  audiencePreviewSchema,
  campaignRecipientListSchema,
  campaignSchema,
  orderCreateResponseSchema,
  type CampaignView,
} from "@lavieco/shared/events";
import type { AuditEventIngestRequest } from "@lavieco/shared/identity";

import { CAMPAIGN_SERVICE, type CampaignService } from "../../modules/campaigns";
import { BUYER, book, inDays, publishedEvent } from "../support/fixtures";
import { bearer, createTestApp, drainOutbox, type TestApp } from "../support/test-app";

let t: TestApp;
let campaigns: CampaignService;
const audited: AuditEventIngestRequest[] = [];

beforeAll(async () => {
  t = await createTestApp(inject("mongoUri"), {
    auditSink: { send: async (event) => void audited.push(event) },
  });
  campaigns = t.app.get(CAMPAIGN_SERVICE, { strict: false });
});

afterAll(async () => {
  await t?.close();
});

const staff = async () => bearer(await t.staffToken(["coordinator"]));
let sequence = 0;
const email = (label: string) => `${label}${(sequence += 1)}@example.test`;

/** Far in the future, so each test has a Vietnam day (and its budget) of its own. */
let dayOffset = 400;
const freshDay = () => new Date(Date.now() + (dayOffset += 1) * 86_400_000);

const TEXTS = {
  name: "Cảm ơn",
  type: "thank_you",
  subject: "Cảm ơn {{ten}}",
  body: "Xin chào {{ten}},\n\nCảm ơn bạn đã đến {{chuong_trinh}}.",
};

async function create(body: Record<string, unknown>) {
  const res = await t
    .http()
    .post("/internal/v1/campaigns")
    .set("authorization", await staff())
    .send({ ...TEXTS, ...body })
    .expect(201);
  return campaignSchema.parse(res.body);
}

async function send(campaign: CampaignView, confirmCount: number, scheduledAt?: string) {
  const session = await t.staffSession(["coordinator"]);
  return t
    .http()
    .post(`/internal/v1/campaigns/${campaign.id}/send`)
    .set("authorization", bearer(session.token))
    .set("x-step-up-token", await t.stepUpToken(session.userId, session.sessionId))
    .send({ confirmCount, revision: campaign.revision, scheduledAt: scheduledAt ?? null });
}

const manual = (...addresses: string[]) => ({
  type: "manual",
  entries: addresses.map((address) => ({ email: address, name: "Khách" })),
});

/** Drains whatever is queued now; ticks are separate "minutes" of the same day. */
async function runOut(now: Date) {
  for (let pass = 0; pass < 40; pass += 1) {
    const { sent, failed, skipped } = await campaigns.tick(now);
    if (sent + failed + skipped === 0) return;
  }
}

const statuses = async (campaignId: string) => {
  const res = await t
    .http()
    .get(`/internal/v1/campaigns/${campaignId}/recipients?limit=100`)
    .set("authorization", await staff())
    .expect(200);
  return campaignRecipientListSchema.parse(res.body).items;
};

const stateOf = async (id: string) => {
  const res = await t
    .http()
    .get(`/internal/v1/campaigns/${id}`)
    .set("authorization", await staff())
    .expect(200);
  return campaignSchema.parse(res.body);
};

describe("audience", () => {
  it("reaches the event's buyers by check-in, one email each, with a link per ticket", async () => {
    const { event, ticketTypeIds } = await publishedEvent(t);
    const came = email("den");
    const absent = email("vang");
    const place = async (address: string, quantity: number) => {
      const res = await book(t, {
        slug: event.slug,
        items: [{ ticketTypeId: ticketTypeIds[0]!, quantity }],
        buyer: { ...BUYER, email: address },
      });
      return orderCreateResponseSchema.parse(res.body).order;
    };
    const order = await place(came, 2);
    await place(absent, 1);
    for (const ticket of order.tickets) {
      await t
        .http()
        .post("/internal/v1/checkins")
        .set("authorization", await staff())
        .send({ eventId: event.id, qrToken: ticket.qrToken })
        .expect(200);
    }
    const preview = async (checkin: string) => {
      const res = await t
        .http()
        .post("/internal/v1/campaigns/audience-preview")
        .set("authorization", await staff())
        .send({ audience: { type: "event", eventId: event.id, checkin } })
        .expect(200);
      return audiencePreviewSchema.parse(res.body);
    };
    expect((await preview("all")).count).toBe(2);
    expect((await preview("checked_in")).samples.map((item) => item.email)).toEqual([came]);
    expect((await preview("not_checked_in")).samples.map((item) => item.email)).toEqual([absent]);

    const created = await t
      .http()
      .post("/internal/v1/surveys")
      .set("authorization", await staff())
      .send({
        kind: "event_feedback",
        eventId: event.id,
        slug: `cam-nhan-${(sequence += 1)}-${Date.now()}`,
        title: "Cảm nhận",
        questions: [{ id: "6f9619ff-8b86-4d11-b42d-00c04fc964ff", type: "rating", label: "Sao?" }],
        settings: { access: "ticket_holders", onePer: "ticket" },
      })
      .expect(201);
    const campaign = await create({
      audience: { type: "event", eventId: event.id, checkin: "checked_in" },
      eventId: event.id,
      surveyId: created.body.id,
      cta: { label: "Gửi cảm nhận", link: "survey" },
    });
    expect((await send(campaign, 1)).status).toBe(200);
    await runOut(freshDay());

    const [mail] = t.emails.to(came);
    expect(mail?.subject).toBe("Cảm ơn Nguyễn Thị Khách");
    expect(mail?.text).toContain(event.title);
    // A link for each of the 2 tickets, and a way out.
    expect(mail?.text.match(/\/khao-sat\/[^?\s]+\?t=/g)).toHaveLength(2);
    expect(mail?.headers?.["List-Unsubscribe"]).toContain("/huy-nhan/");
    expect(mail?.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(t.emails.to(absent).filter((item) => item.subject.startsWith("Cảm ơn"))).toEqual([]);
    expect((await stateOf(campaign.id)).status).toBe("done");
  });

  it("merges duplicates and reports them", async () => {
    const one = email("trung");
    const res = await t
      .http()
      .post("/internal/v1/campaigns/audience-preview")
      .set("authorization", await staff())
      .send({
        audience: {
          type: "manual",
          entries: [{ email: one }, { email: one.toUpperCase() }, { email: email("khac") }],
        },
      })
      .expect(200);
    expect(res.body).toMatchObject({ count: 2, duplicates: 1, suppressed: 0 });
  });
});

describe("the daily budget", () => {
  it("stops at the limit and carries on the next day", async () => {
    const day = freshDay();
    const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(day);
    // 149 of 150 already gone today: only one more goes out.
    await t.db.collection("campaign_daily_usage").insertOne({ day: dayKey, sent: 149 });
    const addresses = [email("ngan"), email("ngan"), email("ngan")];
    const campaign = await create({ audience: manual(...addresses) });
    expect((await send(campaign, 3)).status).toBe(200);

    await runOut(day);
    expect(addresses.filter((address) => t.emails.to(address).length > 0)).toHaveLength(1);
    const midway = await stateOf(campaign.id);
    expect(midway).toMatchObject({ status: "sending", counters: { sent: 1, total: 3 } });
    expect(midway.estimatedDays).toBe(1);

    await runOut(new Date(day.getTime() + 86_400_000));
    expect(addresses.every((address) => t.emails.to(address).length === 1)).toBe(true);
    expect((await stateOf(campaign.id)).status).toBe("done");
  });

  it("paces itself per minute", async () => {
    const addresses = Array.from({ length: 12 }, () => email("nhip"));
    const campaign = await create({ audience: manual(...addresses) });
    await send(campaign, 12);
    const day = freshDay();
    const first = await campaigns.tick(day);
    // CAMPAIGN_RATE_PER_MINUTE defaults to 10.
    expect(first.sent).toBe(10);
    expect((await campaigns.tick(day)).sent).toBe(2);
  });

  it("leaves OTP and ticket emails alone when the campaign budget is spent", async () => {
    const day = new Date();
    const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(day);
    await t.db
      .collection("campaign_daily_usage")
      .updateOne({ day: dayKey }, { $set: { sent: 10_000 } }, { upsert: true });
    const { event, ticketTypeIds } = await publishedEvent(t);
    const buyer = email("ve");
    const booked = await book(t, {
      slug: event.slug,
      items: [{ ticketTypeId: ticketTypeIds[0]!, quantity: 1 }],
      buyer: { ...BUYER, email: buyer },
    });
    expect(booked.status).toBe(201);
    await drainOutbox(t);
    expect(t.emails.to(buyer)).toHaveLength(1);
  });
});

describe("failures", () => {
  it("retries later, then reports it; a failed email can be queued again", async () => {
    const bad = email("loi");
    t.emails.failing.add(bad);
    const campaign = await create({ audience: manual(bad) });
    await send(campaign, 1);
    const start = freshDay();
    await campaigns.tick(start);
    expect((await statuses(campaign.id))[0]).toMatchObject({ status: "queued", error: "Error" });

    // Not before the wait is over.
    expect((await campaigns.tick(start)).failed).toBe(0);
    await campaigns.tick(new Date(start.getTime() + 16 * 60_000));
    await campaigns.tick(new Date(start.getTime() + 32 * 60_000));
    const [row] = await statuses(campaign.id);
    expect(row).toMatchObject({ status: "failed", error: "Error" });
    expect(JSON.stringify(row?.error)).not.toContain(bad);
    expect(await stateOf(campaign.id)).toMatchObject({
      status: "done",
      counters: { failed: 1, sent: 0 },
    });

    t.emails.failing.delete(bad);
    await t
      .http()
      .post(`/internal/v1/campaigns/${campaign.id}/retry-failed`)
      .set("authorization", await staff())
      .expect(200);
    await runOut(new Date(start.getTime() + 40 * 60_000));
    expect(t.emails.to(bad)).toHaveLength(1);
    expect(await stateOf(campaign.id)).toMatchObject({
      status: "done",
      counters: { failed: 0, sent: 1 },
    });
  });

  it("stops while paused and resumes where it was", async () => {
    const addresses = [email("dung"), email("dung")];
    const campaign = await create({ audience: manual(...addresses) });
    await send(campaign, 2);
    await t
      .http()
      .post(`/internal/v1/campaigns/${campaign.id}/pause`)
      .set("authorization", await staff())
      .expect(200);
    const day = freshDay();
    expect((await campaigns.tick(day)).sent).toBe(0);
    await t
      .http()
      .post(`/internal/v1/campaigns/${campaign.id}/resume`)
      .set("authorization", await staff())
      .expect(200);
    expect((await campaigns.tick(day)).sent).toBe(2);
  });

  it("sends nothing more once cancelled", async () => {
    const address = email("huy");
    const campaign = await create({ audience: manual(address) });
    await send(campaign, 1);
    await t
      .http()
      .post(`/internal/v1/campaigns/${campaign.id}/cancel`)
      .set("authorization", await staff())
      .expect(200);
    await campaigns.tick(freshDay());
    expect(t.emails.to(address)).toEqual([]);
  });
});

describe("sending safely", () => {
  it("needs the right, the step-up and the exact count", async () => {
    const address = email("an-toan");
    const campaign = await create({ audience: manual(address) });

    await t
      .http()
      .get("/internal/v1/campaigns")
      .set("authorization", bearer(await t.staffToken(["auditor"])))
      .expect(403);

    const noStepUp = await t
      .http()
      .post(`/internal/v1/campaigns/${campaign.id}/send`)
      .set("authorization", await staff())
      .send({ confirmCount: 1, revision: campaign.revision });
    expect(noStepUp.status).toBe(403);

    const wrong = await send(campaign, 2);
    expect(wrong.status).toBe(409);
    expect(wrong.body.code).toBe("campaign.count_mismatch");

    expect((await send(campaign, 1)).status).toBe(200);
    expect((await send(campaign, 1)).status).toBe(409);

    await drainOutbox(t);
    const entry = audited.find(
      (item) => item.action === "campaign.send" && item.target?.id === campaign.id,
    );
    expect(entry?.meta).toMatchObject({ recipients: 1 });
    expect(JSON.stringify(entry)).not.toContain(address);
  });

  it("only lets who can send campaigns turn on automatic sending", async () => {
    const res = await t
      .http()
      .post("/internal/v1/events")
      .set("authorization", bearer(await t.staffToken(["content_editor"])))
      .send({
        title: "X",
        typeId: "64b7f0c2a1b2c3d4e5f60718",
        format: "offline",
        startAt: inDays(5),
        endAt: inDays(6),
        postEvent: { enabled: true, mode: "send" },
      });
    expect(res.status).toBe(403);
  });
});

describe("unsubscribing", () => {
  it("takes effect from the link, and for what is already queued", async () => {
    const leaving = email("roi");
    const staying = email("o-lai");
    const first = await create({ audience: manual(leaving) });
    await send(first, 1);
    await runOut(freshDay());
    const mail = t.emails.to(leaving)[0]!;
    const token = /\/huy-nhan\/([^\s>]+)/.exec(mail.text)![1]!;
    expect(mail.text).not.toContain(`/huy-nhan/${leaving}`);

    const web = bearer(await t.serviceToken("web"));
    const check = await t
      .http()
      .get(`/internal/v1/email-unsubscribes/${token}`)
      .set("authorization", web)
      .expect(200);
    expect(check.body).toEqual({ valid: true });

    // Queued before the person left, then they leave.
    const queued = await create({ audience: manual(leaving, staying) });
    await send(queued, 2);
    await t
      .http()
      .post("/internal/v1/email-unsubscribes")
      .set("authorization", web)
      .send({ token })
      .expect(204);
    await runOut(freshDay());
    expect(t.emails.to(leaving)).toHaveLength(1);
    expect(t.emails.to(staying)).toHaveLength(1);
    expect((await stateOf(queued.id)).counters).toMatchObject({ sent: 1, skipped: 1 });

    const after = await t
      .http()
      .post("/internal/v1/campaigns/audience-preview")
      .set("authorization", await staff())
      .send({ audience: manual(leaving, staying) })
      .expect(200);
    expect(after.body).toMatchObject({ count: 1, suppressed: 1 });

    await t
      .http()
      .post("/internal/v1/email-unsubscribes")
      .set("authorization", web)
      .send({ token: `${"a".repeat(24)}.${"b".repeat(43)}` })
      .expect(404);
  });
});

describe("after an event", () => {
  async function ended(postEvent: Record<string, unknown>, buyer: string) {
    const { event, ticketTypeIds } = await publishedEvent(t, {
      details: {
        postEvent: { enabled: true, delayHours: 2, audience: "all_buyers", ...postEvent },
      },
    });
    await book(t, {
      slug: event.slug,
      items: [{ ticketTypeId: ticketTypeIds[0]!, quantity: 1 }],
      buyer: { ...BUYER, email: buyer },
    });
    // In the past: the checkout's "starts in the future" rule was satisfied above.
    const endAt = new Date(Date.now() - 3 * 3_600_000);
    await t.db
      .collection("events")
      .updateOne(
        { _id: new mongo.ObjectId(event.id) },
        { $set: { endAt, startAt: new Date(endAt.getTime() - 3_600_000) } },
      );
    return event;
  }

  const ofEvent = async (eventId: string) => {
    const rows = await t.db.collection("campaigns").find({ eventId }).toArray();
    return rows;
  };

  it("creates one draft that waits for review", async () => {
    const buyer = email("nhap");
    const event = await ended({ mode: "draft" }, buyer);
    await t.emails.sent.splice(0);
    await campaigns.tick(new Date());
    await campaigns.tick(new Date());
    const rows = await ofEvent(event.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: "draft", source: "post_event" });
    expect(t.emails.to(buyer)).toEqual([]);
  });

  it("sends by itself when asked to", async () => {
    const buyer = email("tu-gui");
    const event = await ended({ mode: "send" }, buyer);
    await t.emails.sent.splice(0);
    await runOut(freshDay());
    const rows = await ofEvent(event.id);
    expect(rows[0]).toMatchObject({ status: "done", source: "post_event" });
    expect(t.emails.to(buyer)[0]?.subject).toContain(event.title);
  });

  it("waits for the delay", async () => {
    const { event } = await publishedEvent(t, {
      details: { postEvent: { enabled: true, delayHours: 24, mode: "draft" } },
    });
    const endAt = new Date(Date.now() - 3_600_000);
    await t.db
      .collection("events")
      .updateOne(
        { _id: new mongo.ObjectId(event.id) },
        { $set: { endAt, startAt: new Date(endAt.getTime() - 3_600_000) } },
      );
    await campaigns.tick(new Date());
    expect(await ofEvent(event.id)).toEqual([]);
  });
});
