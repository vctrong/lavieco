import { randomUUID } from "node:crypto";

import { eventSchema, type EventView } from "@lavieco/shared/events";

import { bearer, type TestApp } from "./test-app";

const DAY_MS = 86_400_000;
export const inDays = (days: number, hours = 0) =>
  new Date(Date.now() + days * DAY_MS + hours * 3_600_000).toISOString();

export type TicketInput = {
  name?: string;
  price?: number;
  quantity?: number | null;
  maxPerOrder?: number;
};

/** A published event with the given ticket types (and optional form), ready to book. */
export async function publishedEvent(
  t: TestApp,
  options: {
    tickets?: TicketInput[];
    questions?: Record<string, unknown>[];
    details?: Record<string, unknown>;
  } = {},
): Promise<{ event: EventView; ticketTypeIds: string[] }> {
  const staff = bearer(await t.staffToken(["coordinator"]));
  const types = await t.http().get("/internal/v1/event-types").set("authorization", staff);
  const typeId = types.body.items.find((type: { key: string }) => type.key === "workshop").id;
  const created = await t
    .http()
    .post("/internal/v1/events")
    .set("authorization", staff)
    .send({
      title: `Workshop vỏ sò ${randomUUID().slice(0, 8)}`,
      typeId,
      format: "offline",
      startAt: inDays(20),
      endAt: inDays(20, 3),
      venue: { name: "Xưởng LAVIECO", address: "Ninh Kiều, Cần Thơ" },
      summary: "Biến vỏ sò thành chậu cây.",
      ...options.details,
    })
    .expect(201);
  let event = eventSchema.parse(created.body);
  const ticketTypeIds: string[] = [];
  for (const ticket of options.tickets ?? [{}]) {
    const res = await t
      .http()
      .post(`/internal/v1/events/${event.id}/ticket-types`)
      .set("authorization", staff)
      .send({ name: "Vé tiêu chuẩn", price: 0, quantity: 20, maxPerOrder: 4, ...ticket })
      .expect(201);
    ticketTypeIds.push(res.body.id as string);
  }
  if (options.questions) {
    const current = await t
      .http()
      .get(`/internal/v1/events/${event.id}`)
      .set("authorization", staff)
      .expect(200);
    await t
      .http()
      .put(`/internal/v1/events/${event.id}/form`)
      .set("authorization", staff)
      .send({ questions: options.questions, revision: current.body.revision })
      .expect(200);
  }
  const current = await t
    .http()
    .get(`/internal/v1/events/${event.id}`)
    .set("authorization", staff)
    .expect(200);
  const published = await t
    .http()
    .post(`/internal/v1/events/${event.id}/status`)
    .set("authorization", staff)
    .send({ action: "publish", revision: current.body.revision });
  if (published.status !== 200)
    throw new Error(`publish failed: ${JSON.stringify(published.body)}`);
  event = eventSchema.parse(published.body);
  return { event, ticketTypeIds };
}

export const BUYER = {
  fullName: "Nguyễn Thị Khách",
  email: "khach.dat.ve@example.test",
  phone: "0901 234 567",
};

/** Books through the `web` route with a fresh checkout proof for the buyer's email. */
export async function book(
  t: TestApp,
  input: {
    slug: string;
    items: { ticketTypeId: string; quantity: number }[];
    buyer?: typeof BUYER;
    answers?: Record<string, unknown>;
    proof?: string;
    extra?: Record<string, unknown>;
  },
) {
  const buyer = input.buyer ?? BUYER;
  return t
    .http()
    .post("/internal/v1/orders")
    .set("authorization", bearer(await t.serviceToken("web")))
    .send({
      eventSlug: input.slug,
      items: input.items,
      buyer,
      answers: input.answers ?? {},
      dataConsent: true,
      consentVersion: "checkout-2026-10",
      verificationToken: input.proof ?? (await t.emailProof(buyer.email)),
      ...input.extra,
    });
}
