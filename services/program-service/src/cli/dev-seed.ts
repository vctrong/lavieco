import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";

import { mongo } from "mongoose";

import { normalizeEmail, normalizePhone, toSearchKey } from "@lavieco/shared";

import { loadProgramEnv } from "../config/env";
import { REVALIDATE_EVENT_JOB } from "../modules/events";
import { newOrderCode, newQrToken, newTicketCode } from "../modules/orders";
import {
  DEV_BUYERS,
  DEV_EVENTS,
  type DevEvent,
  type DevOrder,
  type DevQuestion,
  type When,
} from "./dev-events";
import { devDatabaseIssue } from "./dev-guard";
import { MIGRATIONS_DIR, runMigrations } from "./migrate";

/**
 * Author of every event written here (a fixed, valid ObjectId: admin views require
 * one); only these are ever reset by a rerun. Older runs wrote "cli:dev-seed".
 */
const SEED_ACTOR = "5eed000000000000000000de";
const isSeedAuthor = (userId: unknown) => userId === SEED_ACTOR || userId === "cli:dev-seed";
const SEED_CONSENT_VERSION = "dev-seed";
const HOLD_MS = 15 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

type Id = mongo.ObjectId;

/** Local Asia/Ho_Chi_Minh day + time, as a UTC Date (docs/03 §1.3). */
function at(now: Date, when: When): Date {
  const local = new Date(now.getTime() + VN_OFFSET_MS);
  const [hours, minutes] = when.time.split(":").map(Number);
  return new Date(
    Date.UTC(
      local.getUTCFullYear(),
      local.getUTCMonth(),
      local.getUTCDate() + when.day,
      hours ?? 0,
      minutes ?? 0,
    ) - VN_OFFSET_MS,
  );
}

type BuiltQuestion = {
  key: string;
  id: string;
  type: DevQuestion["type"];
  optionIds: Map<string, string>;
  doc: Record<string, unknown>;
};

function buildQuestions(questions: readonly DevQuestion[]): BuiltQuestion[] {
  return questions.map((question) => {
    const options = (question.options ?? []).map((label) => ({ id: randomUUID(), label }));
    const id = randomUUID();
    return {
      key: question.key,
      id,
      type: question.type,
      optionIds: new Map(options.map((option) => [option.label, option.id])),
      doc: {
        id,
        type: question.type,
        label: question.label,
        description: question.description ?? "",
        required: question.required,
        options,
        hidden: question.hidden ?? false,
      },
    };
  });
}

function buildAnswers(questions: readonly BuiltQuestion[], order: DevOrder) {
  return questions.flatMap((question) => {
    const raw = order.answers?.[question.key];
    if (raw === undefined) return [];
    if (question.type === "short_text" || question.type === "paragraph") {
      return [{ questionId: question.id, value: String(raw) }];
    }
    const ids = (Array.isArray(raw) ? raw : [raw]).map((label) => {
      const optionId = question.optionIds.get(label);
      if (!optionId) throw new Error(`Seed answer "${label}" is not an option of ${question.key}`);
      return optionId;
    });
    return [{ questionId: question.id, value: question.type === "multiple_choice" ? ids : ids[0] }];
  });
}

/** Orders, answers, tickets and payment events of a seed event; ticket counters follow. */
async function removeSeedChildren(db: mongo.Db, eventId: Id) {
  const orderCodes = (
    await db
      .collection("orders")
      .find({ eventId }, { projection: { orderCode: 1 } })
      .toArray()
  ).map((order) => order.orderCode as number);
  await db.collection("payment_events").deleteMany({ orderCode: { $in: orderCodes } });
  await db.collection("tickets").deleteMany({ eventId });
  await db.collection("order_answers").deleteMany({ eventId });
  await db.collection("orders").deleteMany({ eventId });
  await db.collection("ticket_types").deleteMany({ eventId });
  await db.collection("preview_tokens").deleteMany({ eventId });
}

async function seedEvent(db: mongo.Db, seed: DevEvent, typeId: Id, now: Date) {
  const events = db.collection("events");
  const existing = await events.findOne({ slug: seed.slug, discarded: false });
  if (existing && !isSeedAuthor(existing.createdBy?.userId)) {
    console.log(`skip   ${seed.slug}: slug used by an event made in admin, left untouched`);
    return;
  }
  const eventId: Id = existing?._id ?? new mongo.ObjectId();
  if (existing) await removeSeedChildren(db, eventId);

  const startAt = at(now, seed.start);
  const endAt = at(now, seed.end);
  const questions = buildQuestions(seed.kind === "standard" ? (seed.questions ?? []) : []);
  const createdAt = new Date(Math.min(now.getTime() - 30 * DAY_MS, startAt.getTime() - DAY_MS));

  // Ticket types first: their counters come from the seeded orders (BR-14).
  const ticketTypeIds = new Map<string, Id>();
  const counters = new Map<string, { sold: number; held: number }>();
  const ticketTypeSeeds = seed.kind === "standard" ? (seed.ticketTypes ?? []) : [];
  for (const ticketType of ticketTypeSeeds) {
    ticketTypeIds.set(ticketType.key, new mongo.ObjectId());
    counters.set(ticketType.key, { sold: 0, held: 0 });
  }
  for (const order of seed.orders ?? []) {
    const state = seatStateOf(order.status);
    for (const item of order.items) {
      const counter = counters.get(item.ticketType);
      if (!counter) throw new Error(`${seed.slug}: unknown ticket type ${item.ticketType}`);
      if (state === "sold") counter.sold += item.quantity;
      if (state === "held") counter.held += item.quantity;
    }
  }
  for (const ticketType of ticketTypeSeeds) {
    const counter = counters.get(ticketType.key)!;
    if (ticketType.quantity !== null && counter.sold + counter.held > ticketType.quantity) {
      throw new Error(`${seed.slug}: orders oversell ${ticketType.key}`);
    }
  }

  const visiblePrices = ticketTypeSeeds.filter((t) => !t.hidden).map((t) => t.price);
  const priceFrom = visiblePrices.length > 0 ? Math.min(...visiblePrices) : null;
  // "Miễn phí" = every visible ticket at 0 (docs/03 §9.2).
  const isFree = visiblePrices.length > 0 && Math.max(...visiblePrices) === 0;
  const cancelledAt = seed.status === "cancelled" ? new Date(now.getTime() - DAY_MS) : null;
  const published = seed.status !== "draft";
  const publishedAt = published ? new Date(createdAt.getTime() + DAY_MS) : null;

  await events.replaceOne(
    { _id: eventId },
    {
      schemaVersion: 1,
      kind: seed.kind,
      slug: seed.slug,
      status: seed.status,
      title: seed.title,
      searchKey: toSearchKey(seed.title),
      typeId,
      format: seed.format,
      startAt,
      endAt,
      venue: seed.venue ? { mapUrl: null, ...seed.venue } : null,
      onlineUrl: seed.onlineUrl ?? null,
      summary: seed.summary,
      description: seed.description,
      safetyNotes: seed.safetyNotes ?? "",
      cancellationPolicy: seed.cancellationPolicy ?? "",
      cancellationRules: seed.cancellationRules ?? [],
      minAge: seed.minAge ?? null,
      benefits: (seed.benefits ?? []).map((b) => ({ description: "", ...b })),
      forChildren: seed.forChildren ?? false,
      speakers: (seed.speakers ?? []).map((s) => ({ bio: "", ...s, avatar: null })),
      agenda: (seed.agenda ?? []).map((a) => ({ description: "", ...a })),
      faq: seed.faq ?? [],
      // No image: covers and banners are content-service media (ADR-0020), added in admin.
      cover: null,
      banner: null,
      gallery: [],
      attendance: seed.attendance
        ? {
            count: seed.attendance.count,
            approvedAt: seed.attendance.approved ? createdAt : null,
            approvedBy: seed.attendance.approved ? SEED_ACTOR : null,
          }
        : { count: null, approvedAt: null, approvedBy: null },
      cancellation:
        cancelledAt && seed.cancellationReason
          ? { reason: seed.cancellationReason, at: cancelledAt, by: SEED_ACTOR }
          : null,
      form: { questions: questions.map((question) => question.doc) },
      pricing: { isFree, priceFrom },
      publishedAt,
      firstPublishedAt: publishedAt,
      statusHistory: statusHistoryOf(seed, publishedAt, startAt, endAt),
      discarded: false,
      discardedAt: null,
      revision: 1,
      createdBy: { userId: SEED_ACTOR },
      updatedBy: { userId: SEED_ACTOR },
      createdAt,
      updatedAt: publishedAt ?? createdAt,
    },
    { upsert: true },
  );

  if (ticketTypeSeeds.length > 0) {
    await db.collection("ticket_types").insertMany(
      ticketTypeSeeds.map((ticketType, index) => ({
        _id: ticketTypeIds.get(ticketType.key)!,
        schemaVersion: 1,
        eventId,
        name: ticketType.name,
        description: ticketType.description ?? "",
        price: ticketType.price,
        quantity: ticketType.quantity,
        saleStartAt: ticketType.saleStartAt ? at(now, ticketType.saleStartAt) : null,
        saleEndAt: ticketType.saleEndAt ? at(now, ticketType.saleEndAt) : null,
        maxPerOrder: ticketType.maxPerOrder,
        sortOrder: (index + 1) * 10,
        hidden: ticketType.hidden ?? false,
        sold: counters.get(ticketType.key)!.sold,
        held: counters.get(ticketType.key)!.held,
        revision: 1,
        createdAt,
        updatedAt: createdAt,
      })),
    );
  }

  let tickets = 0;
  for (const order of seed.orders ?? []) {
    tickets += await seedOrder(db, {
      seed,
      order,
      eventId,
      startAt,
      questions,
      ticketTypeIds,
      now,
    });
  }
  await db.collection("outbox").insertOne({
    schemaVersion: 1,
    type: REVALIDATE_EVENT_JOB,
    payload: { slug: seed.slug },
    status: "pending",
    attempts: 0,
    availableAt: now,
    lockedUntil: null,
    lastErrorCode: null,
    purgeAt: null,
    createdAt: now,
    updatedAt: now,
  });
  const orders = seed.orders?.length ?? 0;
  console.log(
    `${existing ? "reset " : "create"} ${seed.slug}: ${seed.status}, ${ticketTypeSeeds.length} ticket type(s), ${orders} order(s), ${tickets} ticket(s)`,
  );
}

function seatStateOf(status: DevOrder["status"]): "held" | "sold" | "released" {
  if (status === "paid") return "sold";
  if (status === "pending") return "held";
  return "released";
}

function statusHistoryOf(seed: DevEvent, publishedAt: Date | null, startAt: Date, endAt: Date) {
  if (!publishedAt) return [];
  if (seed.kind === "past") {
    return [{ from: "draft", to: "ended", at: publishedAt, by: SEED_ACTOR }];
  }
  const history = [{ from: "draft", to: "published", at: publishedAt, by: SEED_ACTOR }];
  if (seed.status === "closed") {
    history.push({
      from: "published",
      to: "closed",
      at: new Date(startAt.getTime() - 2 * DAY_MS),
      by: SEED_ACTOR,
    });
  }
  if (seed.status === "ended") {
    history.push({ from: "published", to: "ended", at: endAt, by: SEED_ACTOR });
  }
  if (seed.status === "cancelled") {
    history.push({
      from: "published",
      to: "cancelled",
      at: new Date(startAt.getTime() - 3 * DAY_MS),
      by: SEED_ACTOR,
    });
  }
  return history;
}

type OrderContext = {
  seed: DevEvent;
  order: DevOrder;
  eventId: Id;
  startAt: Date;
  questions: readonly BuiltQuestion[];
  ticketTypeIds: ReadonlyMap<string, Id>;
  now: Date;
};

/** One order with its answers, tickets and payment event; returns the tickets issued. */
async function seedOrder(db: mongo.Db, context: OrderContext): Promise<number> {
  const { seed, order, eventId, startAt, questions, ticketTypeIds, now } = context;
  const buyer = DEV_BUYERS[order.buyer];
  if (!buyer) throw new Error(`${seed.slug}: unknown buyer ${order.buyer}`);
  const phoneNormalized = normalizePhone(buyer.phone);
  if (!phoneNormalized) throw new Error(`${seed.slug}: invalid phone of buyer ${order.buyer}`);
  const ticketTypes = new Map((seed.ticketTypes ?? []).map((t) => [t.key, t]));

  const placedDaysAgo = order.placedDaysAgo ?? 2;
  // Pending orders were placed a few minutes ago so their 15-minute hold is still on.
  const createdAt =
    order.status === "pending"
      ? new Date(now.getTime() - 3 * 60 * 1000)
      : new Date(Math.min(now.getTime(), startAt.getTime()) - placedDaysAgo * DAY_MS);
  const expiresAt = new Date(createdAt.getTime() + HOLD_MS);
  const items = order.items.map((item) => {
    const ticketType = ticketTypes.get(item.ticketType)!;
    return {
      ticketTypeId: ticketTypeIds.get(item.ticketType)!,
      name: ticketType.name,
      unitPrice: ticketType.price,
      quantity: item.quantity,
    };
  });
  const amount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const paidAt =
    order.status === "paid" || order.status === "refunded"
      ? new Date(createdAt.getTime() + 2 * 60 * 1000)
      : null;
  const refundedAt =
    order.status === "refunded" ? new Date((paidAt ?? createdAt).getTime() + DAY_MS) : null;
  const orderCode = await uniqueOrderCode(db);
  const orderId = new mongo.ObjectId();
  // A cancelled event: paid tickets are void and a paid amount awaits a manual refund.
  const eventCancelled = seed.status === "cancelled";
  const voidedAt =
    refundedAt ?? (eventCancelled && paidAt ? new Date(now.getTime() - DAY_MS) : null);

  await db.collection("orders").insertOne({
    _id: orderId,
    schemaVersion: 1,
    orderCode,
    eventId,
    userId: null,
    verificationId: `${SEED_ACTOR}:${randomUUID()}`,
    buyer: {
      fullName: buyer.fullName,
      email: buyer.email,
      emailNormalized: normalizeEmail(buyer.email),
      phone: buyer.phone,
      phoneNormalized,
      isGuardian: seed.forChildren ?? false,
    },
    items,
    amount,
    status: order.status,
    seatState: seatStateOf(order.status),
    expiresAt,
    paidAt,
    cancelledAt:
      order.status === "cancelled" ? new Date(createdAt.getTime() + 5 * 60 * 1000) : null,
    expiredAt: order.status === "expired" ? expiresAt : null,
    refundedAt,
    refundNote:
      order.status === "refunded" ? "Khách báo bận, đã chuyển khoản hoàn (dữ liệu dev)." : "",
    note: order.note ?? "",
    consent: { version: SEED_CONSENT_VERSION, at: createdAt },
    safetyAcknowledgedAt: (seed.safetyNotes ?? "").trim() ? createdAt : null,
    flags: {
      refundRequired: eventCancelled && order.status === "paid" && amount > 0,
      amountMismatch: false,
      latePayment: false,
    },
    payment: null,
    lastReconciledAt: null,
    anonymizedAt: null,
    revision: 1,
    createdAt,
    updatedAt: refundedAt ?? paidAt ?? createdAt,
  });
  await db.collection("order_answers").insertOne({
    schemaVersion: 1,
    orderId,
    eventId,
    answers: buildAnswers(questions, order),
    createdAt,
    updatedAt: createdAt,
  });

  if (!paidAt) return 0;
  if (amount > 0) {
    await db.collection("payment_events").insertOne({
      schemaVersion: 1,
      orderCode,
      source: "webhook",
      amount,
      reference: `DEVSEED${orderCode}`,
      paymentLinkId: null,
      transactionAt: paidAt.toISOString(),
      outcome: "paid",
      createdAt: paidAt,
      updatedAt: paidAt,
    });
  }
  // BR-16: one random QR per seat; never stored as an image.
  const ticketDocs: Array<Record<string, unknown>> = [];
  let checkedIn = order.checkedIn ?? 0;
  for (const item of items) {
    for (let seat = 0; seat < item.quantity; seat += 1) {
      const used = order.status === "paid" && checkedIn > 0;
      if (used) checkedIn -= 1;
      ticketDocs.push({
        schemaVersion: 1,
        code: newTicketCode(),
        qrToken: newQrToken(),
        orderId,
        eventId,
        ticketTypeId: item.ticketTypeId,
        ticketTypeName: item.name,
        status: voidedAt ? "void" : used ? "used" : "valid",
        checkedInAt: used ? new Date(startAt.getTime() - 10 * 60 * 1000) : null,
        checkedInBy: used ? SEED_ACTOR : null,
        voidedAt,
        createdAt: paidAt,
        updatedAt: refundedAt ?? paidAt,
      });
    }
  }
  await db.collection("tickets").insertMany(ticketDocs);
  return ticketDocs.length;
}

async function uniqueOrderCode(db: mongo.Db): Promise<number> {
  let orderCode = newOrderCode();
  while (await db.collection("orders").findOne({ orderCode })) orderCode = newOrderCode();
  return orderCode;
}

/**
 * `npm run dev:seed` (program part): programs, ticket types, orders and tickets in the
 * LOCAL MongoDB for every state the web and admin render (docs/dev-local.md). Rerunning
 * rebuilds only what this command created (marked `cli:dev-seed`), with dates moved
 * relative to today; events made in admin are never touched. Refuses to run unless
 * NODE_ENV=development and MongoDB is on this machine.
 */
async function main() {
  const env = loadProgramEnv();
  const issue = devDatabaseIssue(env);
  if (issue) {
    console.error(`dev:seed refused: ${issue}. It only writes into a local development database.`);
    process.exit(2);
  }

  const client = new mongo.MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 5_000 });
  try {
    try {
      await client.connect();
      await client.db(env.MONGODB_DB).command({ ping: 1 });
    } catch {
      console.error("dev:seed: MongoDB is not reachable. Start it with: npm run dev:infra");
      process.exit(1);
    }
    const db = client.db(env.MONGODB_DB);
    // Indexes and the event types the programs point to.
    const requireMigration = createRequire(__filename);
    await runMigrations(db, MIGRATIONS_DIR, async (path) => requireMigration(path) as unknown);
    const types = await db.collection("event_types").find().toArray();
    const typeIds = new Map(types.map((type) => [type.key as string, type._id]));

    const now = new Date();
    for (const seed of DEV_EVENTS) {
      const typeId = typeIds.get(seed.typeKey);
      if (!typeId) throw new Error(`Event type ${seed.typeKey} is missing`);
      await seedEvent(db, seed, typeId, now);
    }
    console.log(
      "dev:seed (program) done. Buyers are *@lavieco.test; look tickets up at /tra-cuu-ve (OTP in Mailpit).",
    );
  } finally {
    await client.close();
  }
}

void main();
