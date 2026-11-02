import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import {
  orderCreateResponseSchema,
  publicSurveySchema,
  surveyResultsSchema,
  surveySchema,
} from "@lavieco/shared/events";

import { BUYER, book, publishedEvent } from "../support/fixtures";
import { bearer, createTestApp, type TestApp } from "../support/test-app";

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp(inject("mongoUri"));
});

afterAll(async () => {
  await t?.close();
});

const staff = async () => bearer(await t.staffToken(["coordinator"]));
const web = async () => bearer(await t.serviceToken("web"));
const STARS = randomUUID();
const NPS = randomUUID();
const TEXT = randomUUID();

const questions = [
  { id: randomUUID(), type: "section", label: "Cảm nhận chung" },
  { id: STARS, type: "rating", label: "Hài lòng?", required: true },
  { id: NPS, type: "scale", label: "Giới thiệu cho bạn bè?", scaleLow: "Không", scaleHigh: "Có" },
  { id: TEXT, type: "paragraph", label: "Góp ý" },
];

let counter = 0;

async function openSurvey(body: Record<string, unknown>) {
  const slug = `khao-sat-${(counter += 1)}-${randomUUID().slice(0, 8)}`;
  const created = await t
    .http()
    .post("/internal/v1/surveys")
    .set("authorization", await staff())
    .send({ kind: "standalone", slug, title: "Khảo sát", questions, settings: {}, ...body })
    .expect(201);
  const survey = surveySchema.parse(created.body);
  const opened = await t
    .http()
    .post(`/internal/v1/surveys/${survey.id}/status`)
    .set("authorization", await staff())
    .send({ status: "open", revision: survey.revision })
    .expect(200);
  return surveySchema.parse(opened.body);
}

const submit = async (slug: string, body: Record<string, unknown>) =>
  t
    .http()
    .post(`/internal/v1/public-surveys/${slug}/responses`)
    .set("authorization", await web())
    .send({ answers: { [STARS]: 5 }, ...body });

describe("a standalone survey for a school project", () => {
  it("collects responses, one per browser, and exports them", async () => {
    const survey = await openSurvey({
      settings: { collectEmail: "optional", consentText: "Tôi đồng ý cho dùng câu trả lời." },
    });
    const respondentId = randomUUID();

    const noConsent = await submit(survey.slug, { respondentId });
    expect(noConsent.status).toBe(422);
    expect(noConsent.body.code).toBe("survey.consent_required");

    const first = await submit(survey.slug, {
      respondentId,
      consent: true,
      email: "sinh.vien@example.test",
      answers: { [STARS]: 4, [NPS]: 10, [TEXT]: "=SUM(A1)" },
    });
    expect(first.status).toBe(204);
    const again = await submit(survey.slug, { respondentId, consent: true });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe("survey.already_answered");

    const seen = await t
      .http()
      .get(`/internal/v1/public-surveys/${survey.slug}?r=${respondentId}`)
      .set("authorization", await web())
      .expect(200);
    expect(publicSurveySchema.parse(seen.body).state).toBe("already_answered");

    const results = await t
      .http()
      .get(`/internal/v1/surveys/${survey.id}/results`)
      .set("authorization", await staff())
      .expect(200);
    const parsed = surveyResultsSchema.parse(results.body);
    expect(parsed.total).toBe(1);
    const stars = parsed.questions.find((item) => item.questionId === STARS);
    expect(stars?.average).toBe(4);
    const nps = parsed.questions.find((item) => item.questionId === NPS);
    expect(nps?.nps).toBe(100);

    const session = await t.staffSession(["coordinator"]);
    const stepUp = await t.stepUpToken(session.userId, session.sessionId);
    const csv = await t
      .http()
      .get(`/internal/v1/surveys/${survey.id}/export?format=csv`)
      .set("authorization", bearer(session.token))
      .set("x-step-up-token", stepUp)
      .expect(200);
    expect(csv.headers["content-type"]).toContain("text/csv");
    // A typed formula stays text in the export.
    expect(csv.text).toContain(`"'=SUM(A1)"`);
    expect(csv.text).toContain("sinh.vien@example.test");

    await t
      .http()
      .get(`/internal/v1/surveys/${survey.id}/export`)
      .set("authorization", await staff())
      .expect(403);
  });

  it("respects the window, the limit and closing", async () => {
    const full = await openSurvey({ settings: { maxResponses: 1 } });
    expect((await submit(full.slug, { respondentId: randomUUID() })).status).toBe(204);
    const over = await submit(full.slug, { respondentId: randomUUID() });
    expect(over.status).toBe(409);
    expect(over.body.code).toBe("survey.closed");

    const later = await openSurvey({
      settings: { opensAt: new Date(Date.now() + 3_600_000).toISOString() },
    });
    const notYet = await t
      .http()
      .get(`/internal/v1/public-surveys/${later.slug}`)
      .set("authorization", await web())
      .expect(200);
    expect(notYet.body).toMatchObject({ state: "not_open", questions: [] });
  });

  it("hides a draft, and refuses wrong answers", async () => {
    const created = await t
      .http()
      .post("/internal/v1/surveys")
      .set("authorization", await staff())
      .send({
        kind: "standalone",
        slug: `nhap-${randomUUID().slice(0, 8)}`,
        title: "Nháp",
        questions,
        settings: {},
      })
      .expect(201);
    await t
      .http()
      .get(`/internal/v1/public-surveys/${created.body.slug}`)
      .set("authorization", await web())
      .expect(404);

    const survey = await openSurvey({});
    const bad = await submit(survey.slug, {
      respondentId: randomUUID(),
      answers: { [STARS]: 9 },
    });
    expect(bad.status).toBe(422);
    expect(bad.body.code).toBe("survey.answers_invalid");
  });

  it("needs survey:write to change and survey:read to read", async () => {
    await t
      .http()
      .post("/internal/v1/surveys")
      .set("authorization", bearer(await t.staffToken(["auditor"])))
      .send({ kind: "standalone", slug: "khong-duoc", title: "X", questions, settings: {} })
      .expect(403);
    await t
      .http()
      .get("/internal/v1/surveys")
      .set("authorization", bearer(await t.staffToken(["content_editor"])))
      .expect(403);
    await t
      .http()
      .get("/internal/v1/surveys")
      .set("authorization", bearer(await t.staffToken(["auditor"])))
      .expect(200);
  });
});

describe("event feedback, per ticket", () => {
  async function bookedTickets(email: string, quantity = 2) {
    const { event, ticketTypeIds } = await publishedEvent(t);
    const res = await book(t, {
      slug: event.slug,
      items: [{ ticketTypeId: ticketTypeIds[0]!, quantity }],
      buyer: { ...BUYER, email },
    });
    return { event, order: orderCreateResponseSchema.parse(res.body).order };
  }

  it("takes one answer per ticket, through the ticket's link only", async () => {
    const { event, order } = await bookedTickets("feedback@example.test");
    const survey = await openSurvey({
      kind: "event_feedback",
      eventId: event.id,
      settings: { access: "ticket_holders", onePer: "ticket" },
    });
    const [one, two] = order.tickets.map((ticket) => ticket.shareToken!);

    const noLink = await submit(survey.slug, {});
    expect(noLink.status).toBe(422);
    expect(noLink.body.code).toBe("survey.link_invalid");
    const page = await t
      .http()
      .get(`/internal/v1/public-surveys/${survey.slug}`)
      .set("authorization", await web())
      .expect(200);
    expect(page.body.state).toBe("invalid_link");

    expect((await submit(survey.slug, { ticketToken: one })).status).toBe(204);
    expect((await submit(survey.slug, { ticketToken: one })).status).toBe(409);
    expect((await submit(survey.slug, { ticketToken: two })).status).toBe(204);

    const stored = await t.db
      .collection("survey_responses")
      .find({ surveyId: new (await import("mongoose")).Types.ObjectId(survey.id) })
      .toArray();
    expect(stored).toHaveLength(2);
    expect(stored.every((row) => row.ticketId !== null && row.orderId !== null)).toBe(true);

    const link = await t
      .http()
      .get(`/internal/v1/published-events/${event.slug}/feedback-survey`)
      .set("authorization", await web())
      .expect(200);
    expect(link.body.slug).toBe(survey.slug);
  });

  it("refuses a ticket of another event", async () => {
    const { event } = await bookedTickets("mot@example.test");
    const other = await bookedTickets("hai@example.test");
    const survey = await openSurvey({
      kind: "event_feedback",
      eventId: event.id,
      settings: { access: "ticket_holders", onePer: "ticket" },
    });
    const res = await submit(survey.slug, { ticketToken: other.order.tickets[0]!.shareToken });
    expect(res.status).toBe(422);
  });

  it("anonymous: blocks a second answer but keeps no link to the ticket or the buyer", async () => {
    const { event, order } = await bookedTickets("an.danh@example.test");
    const survey = await openSurvey({
      kind: "event_feedback",
      eventId: event.id,
      settings: { anonymous: true, access: "ticket_holders", onePer: "ticket" },
    });
    const token = order.tickets[0]!.shareToken!;
    expect((await submit(survey.slug, { ticketToken: token })).status).toBe(204);
    expect((await submit(survey.slug, { ticketToken: token })).status).toBe(409);

    const { Types } = await import("mongoose");
    const [row] = await t.db
      .collection("survey_responses")
      .find({ surveyId: new Types.ObjectId(survey.id) })
      .toArray();
    expect(row).toMatchObject({ ticketId: null, orderId: null, email: null, name: null });
    const body = JSON.stringify(row);
    expect(body).not.toContain("an.danh@example.test");
    expect(body).not.toContain(order.tickets[0]!.code);
  });
});
