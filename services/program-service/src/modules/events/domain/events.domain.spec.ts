import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { EventAction, EventForm, EventReadiness, EventStatus } from "@lavieco/shared/events";

import type { TicketTypeRecord } from "../../ticketing";
import { duplicateOf } from "./duplicate";
import type { EventContent, EventRecord } from "./event";
import { nextStatus, type TransitionContext } from "./event-lifecycle";
import { baseSlug, duplicateBaseSlug, firstFreeSlug } from "./event-slug";
import { assertFormChangeAllowed } from "./form-rules";
import { decodeCursor, encodeCursor, monthRange } from "./public-filters";
import { readinessOf } from "./publish-readiness";

const NOW = new Date("2026-10-18T03:00:00.000Z");
const READY: EventReadiness = { blockers: [], warnings: [] };

function content(overrides: Partial<EventContent> = {}): EventContent {
  return {
    title: "Workshop làm chậu cây từ bột vỏ sò",
    typeId: "64b7f0c2a1b2c3d4e5f60718",
    format: "offline",
    startAt: new Date("2026-11-15T02:00:00.000Z"),
    endAt: new Date("2026-11-15T05:00:00.000Z"),
    venue: { name: "Xưởng LAVIECO", address: "Ninh Kiều, Cần Thơ", mapUrl: null },
    onlineUrl: null,
    summary: "Biến vỏ sò thành chậu cây.",
    description: "",
    safetyNotes: "",
    cancellationPolicy: "",
    forChildren: false,
    speakers: [],
    agenda: [],
    faq: [],
    ...overrides,
  };
}

describe("event lifecycle", () => {
  const ctx = (overrides: Partial<TransitionContext> = {}): TransitionContext => ({
    kind: "standard",
    status: "draft",
    hasRegistrations: false,
    readiness: READY,
    ...overrides,
  });

  it.each<[EventStatus, EventAction, EventStatus]>([
    ["draft", "publish", "published"],
    ["published", "close", "closed"],
    ["closed", "reopen", "published"],
    ["published", "end", "ended"],
    ["closed", "end", "ended"],
    ["published", "unpublish", "draft"],
    ["closed", "unpublish", "draft"],
  ])("standard %s --%s--> %s", (status, action, expected) => {
    expect(nextStatus(action, ctx({ status }))).toBe(expected);
  });

  it.each<[EventStatus, EventAction]>([
    ["draft", "close"],
    ["draft", "end"],
    ["draft", "unpublish"],
    ["published", "publish"],
    ["published", "reopen"],
    ["ended", "reopen"],
    ["ended", "unpublish"],
    ["ended", "publish"],
  ])("refuses %s --%s-->", (status, action) => {
    expect(() => nextStatus(action, ctx({ status }))).toThrow("event.invalid_transition");
  });

  it("refuses to unpublish once someone registered (BR-17)", () => {
    expect(() =>
      nextStatus("unpublish", ctx({ status: "published", hasRegistrations: true })),
    ).toThrow("event.has_registrations");
  });

  it("refuses to publish with blockers, but warnings do not block", () => {
    expect(() =>
      nextStatus("publish", ctx({ readiness: { blockers: ["venue_missing"], warnings: [] } })),
    ).toThrow("event.not_publishable");
    expect(
      nextStatus("publish", ctx({ readiness: { blockers: [], warnings: ["online_url_missing"] } })),
    ).toBe("published");
  });

  it("publishes a past event straight to ended and allows taking it back", () => {
    expect(nextStatus("publish", ctx({ kind: "past" }))).toBe("ended");
    expect(nextStatus("unpublish", ctx({ kind: "past", status: "ended" }))).toBe("draft");
    expect(() => nextStatus("close", ctx({ kind: "past", status: "ended" }))).toThrow(
      "event.invalid_transition",
    );
  });
});

describe("publish readiness", () => {
  const base = {
    kind: "standard" as const,
    visibleTicketTypes: 1,
    typeSelectable: true,
    now: NOW,
  };

  it("is ready for a complete future offline event without safety notes", () => {
    expect(readinessOf({ ...base, content: content() })).toEqual(READY);
  });

  it("blocks past start, missing ticket types, missing venue and archived type", () => {
    const result = readinessOf({
      ...base,
      visibleTicketTypes: 0,
      typeSelectable: false,
      content: content({ startAt: new Date("2026-10-01T00:00:00.000Z"), venue: null }),
    });
    expect(result.blockers).toEqual([
      "start_in_past",
      "ticket_type_missing",
      "venue_missing",
      "event_type_archived",
    ]);
  });

  it("only warns when an online event has no link yet", () => {
    const result = readinessOf({
      ...base,
      content: content({ format: "online", venue: null, onlineUrl: null }),
    });
    expect(result).toEqual({ blockers: [], warnings: ["online_url_missing"] });
  });

  it("lets a past event skip tickets and the future start, but it must be over", () => {
    const past = content({
      startAt: new Date("2025-03-01T02:00:00.000Z"),
      endAt: new Date("2025-03-01T05:00:00.000Z"),
    });
    expect(readinessOf({ ...base, kind: "past", visibleTicketTypes: 0, content: past })).toEqual(
      READY,
    );
    const running = content({
      startAt: new Date("2026-10-18T01:00:00.000Z"),
      endAt: new Date("2026-10-18T05:00:00.000Z"),
    });
    expect(
      readinessOf({ ...base, kind: "past", visibleTicketTypes: 0, content: running }).blockers,
    ).toEqual(["past_event_not_finished"]);
  });
});

describe("form rules after registrations (BR-17)", () => {
  const optionA = { id: randomUUID(), label: "S" };
  const optionB = { id: randomUUID(), label: "M" };
  const size = {
    id: randomUUID(),
    type: "dropdown" as const,
    label: "Cỡ tạp dề",
    description: "",
    required: true,
    options: [optionA, optionB],
    hidden: false,
  };
  const note = {
    id: randomUUID(),
    type: "paragraph" as const,
    label: "Ghi chú",
    description: "",
    required: false,
    options: [],
    hidden: false,
  };
  const previous: EventForm = { questions: [size, note] };
  const locked = { kind: "standard" as const, hasRegistrations: true };

  it("allows anything before registrations", () => {
    expect(() =>
      assertFormChangeAllowed(previous, { questions: [] }, { ...locked, hasRegistrations: false }),
    ).not.toThrow();
  });

  it("allows adding, hiding, rewording, reordering and adding options", () => {
    const next: EventForm = {
      questions: [
        { ...note, label: "Lời nhắn", hidden: true },
        { ...size, options: [optionA, optionB, { id: randomUUID(), label: "L" }] },
        { ...note, id: randomUUID() },
      ],
    };
    expect(() => assertFormChangeAllowed(previous, next, locked)).not.toThrow();
  });

  it("refuses removing a question, changing its type or removing an option", () => {
    expect(() => assertFormChangeAllowed(previous, { questions: [size] }, locked)).toThrow(
      "event.form_locked",
    );
    expect(() =>
      assertFormChangeAllowed(
        previous,
        { questions: [{ ...size, type: "single_choice" }, note] },
        locked,
      ),
    ).toThrow("event.form_locked");
    expect(() =>
      assertFormChangeAllowed(
        previous,
        { questions: [{ ...size, options: [optionA] }, note] },
        locked,
      ),
    ).toThrow("event.form_locked");
  });

  it("refuses any question on a past event", () => {
    expect(() =>
      assertFormChangeAllowed(
        { questions: [] },
        { questions: [note] },
        { kind: "past", hasRegistrations: false },
      ),
    ).toThrow("event.past_event_restricted");
  });
});

describe("duplicate", () => {
  const source: EventRecord = {
    ...content(),
    id: "64b7f0c2a1b2c3d4e5f60720",
    kind: "standard",
    slug: "workshop-vo-so",
    status: "ended",
    cover: null,
    gallery: [],
    form: { questions: [] },
    pricing: { isFree: false, priceFrom: 150_000 },
    publishedAt: NOW,
    firstPublishedAt: NOW,
    revision: 7,
    createdBy: { userId: "64b7f0c2a1b2c3d4e5f60721" },
    updatedBy: { userId: "64b7f0c2a1b2c3d4e5f60721" },
    createdAt: NOW,
    updatedAt: NOW,
  };
  const sold: TicketTypeRecord = {
    id: "64b7f0c2a1b2c3d4e5f60722",
    eventId: source.id,
    name: "Vé tiêu chuẩn",
    description: "",
    price: 150_000,
    quantity: 20,
    saleStartAt: null,
    saleEndAt: null,
    maxPerOrder: 4,
    sortOrder: 0,
    hidden: false,
    sold: 18,
    held: 2,
    revision: 3,
  };

  it("copies content and ticket types without counters or status", () => {
    const copy = duplicateOf(source, [sold]);
    expect(copy.content.title).toBe("Workshop làm chậu cây từ bột vỏ sò (bản sao)");
    expect(copy.ticketTypes).toEqual([
      expect.objectContaining({ name: "Vé tiêu chuẩn", price: 150_000, quantity: 20 }),
    ]);
    expect(copy.ticketTypes[0]).not.toHaveProperty("sold");
    expect(copy.ticketTypes[0]).not.toHaveProperty("held");
    expect(copy).not.toHaveProperty("status");
  });
});

describe("slugs", () => {
  it("builds base slugs and picks the first free one", () => {
    expect(baseSlug("Triển lãm Dấu chân phù sa")).toBe("trien-lam-dau-chan-phu-sa");
    expect(duplicateBaseSlug("workshop-vo-so")).toBe("workshop-vo-so-ban-sao");
    expect(firstFreeSlug("a-b", new Set(["a-b", "a-b-2"]))).toBe("a-b-3");
  });
});

describe("public filters", () => {
  it("maps a month to Vietnam-time bounds", () => {
    expect(monthRange("2026-11")).toEqual({
      from: new Date("2026-10-31T17:00:00.000Z"),
      to: new Date("2026-11-30T17:00:00.000Z"),
    });
  });

  it("round-trips cursors and ignores garbage", () => {
    const cursor = { startAt: NOW, id: "64b7f0c2a1b2c3d4e5f60718" };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
    expect(decodeCursor("not-a-cursor")).toBeNull();
  });
});
