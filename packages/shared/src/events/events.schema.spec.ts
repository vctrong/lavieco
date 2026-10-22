import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { formQuestionSchema, eventFormSchema } from "./event-form.schema";
import { BENEFIT_ICONS } from "./enums";
import { eventCancelRequestSchema, eventCreateRequestSchema } from "./event.schema";
import { EVENT_LIMITS } from "./limits";
import { publicEventDetailSchema } from "./public-event.schema";
import { ticketTypeInputSchema } from "./ticket-type.schema";

const base = {
  title: "Workshop làm chậu cây từ bột vỏ sò",
  typeId: "64b7f0c2a1b2c3d4e5f60718",
  format: "offline",
  startAt: "2026-11-15T02:00:00.000Z",
  endAt: "2026-11-15T05:00:00.000Z",
};

describe("eventCreateRequestSchema", () => {
  it("fills defaults and keeps a standard kind", () => {
    const parsed = eventCreateRequestSchema.parse(base);
    expect(parsed.kind).toBe("standard");
    expect(parsed.safetyNotes).toBe("");
    expect(parsed.speakers).toEqual([]);
  });

  it("refuses an end before the start", () => {
    const result = eventCreateRequestSchema.safeParse({ ...base, endAt: base.startAt });
    expect(result.success).toBe(false);
  });

  it("refuses non-http links", () => {
    const result = eventCreateRequestSchema.safeParse({
      ...base,
      onlineUrl: "javascript:alert(1)",
    });
    expect(result.success).toBe(false);
  });

  it("refuses a malformed slug", () => {
    expect(eventCreateRequestSchema.safeParse({ ...base, slug: "Có Dấu" }).success).toBe(false);
  });

  it("takes cover and gallery as media ids with alt text (ADR-0020)", () => {
    const image = { mediaId: "64b7f0c2a1b2c3d4e5f60719", alt: "Bàn làm việc" };
    const parsed = eventCreateRequestSchema.parse({ ...base, cover: image, gallery: [] });
    expect(parsed.cover).toEqual(image);
    expect(eventCreateRequestSchema.parse(base).gallery).toEqual([]);
    expect(
      eventCreateRequestSchema.safeParse({ ...base, cover: { ...image, alt: " " } }).success,
    ).toBe(false);
  });

  it("caps the gallery at 12 distinct images", () => {
    const images = Array.from({ length: 13 }, (_, index) => ({
      mediaId: `64b7f0c2a1b2c3d4e5f607${String(index).padStart(2, "0")}`,
      alt: "Ảnh",
    }));
    expect(eventCreateRequestSchema.safeParse({ ...base, gallery: images }).success).toBe(false);
    expect(
      eventCreateRequestSchema.safeParse({ ...base, gallery: images.slice(0, 12) }).success,
    ).toBe(true);
    const twice = [images[0], images[0]];
    expect(eventCreateRequestSchema.safeParse({ ...base, gallery: twice }).success).toBe(false);
  });
});

describe("formQuestionSchema", () => {
  it("requires options for choice questions", () => {
    const result = formQuestionSchema.safeParse({
      id: randomUUID(),
      type: "dropdown",
      label: "Size",
      required: true,
    });
    expect(result.success).toBe(false);
  });

  it("refuses options on text questions", () => {
    const result = formQuestionSchema.safeParse({
      id: randomUUID(),
      type: "short_text",
      label: "Bạn biết LAVIECO qua đâu?",
      required: false,
      options: [{ id: randomUUID(), label: "Facebook" }],
    });
    expect(result.success).toBe(false);
  });

  it("refuses duplicate question ids", () => {
    const id = randomUUID();
    const question = { id, type: "paragraph", label: "Ghi chú", required: false };
    expect(eventFormSchema.safeParse({ questions: [question, question] }).success).toBe(false);
  });
});

describe("ticketTypeInputSchema", () => {
  it("accepts an unlimited free ticket", () => {
    const parsed = ticketTypeInputSchema.parse({
      name: "Vé tham quan",
      price: 0,
      quantity: null,
      maxPerOrder: 5,
    });
    expect(parsed.hidden).toBe(false);
  });

  it("refuses a non-integer price", () => {
    const result = ticketTypeInputSchema.safeParse({
      name: "Vé",
      price: 1.5,
      quantity: 10,
      maxPerOrder: 1,
    });
    expect(result.success).toBe(false);
  });
});

describe("publicEventDetailSchema", () => {
  it("has no field that could leak private data", () => {
    const keys = Object.keys(publicEventDetailSchema.shape);
    const privateKeys = [
      "onlineUrl",
      "createdBy",
      "updatedBy",
      "form",
      "revision",
      "id",
      "attendance",
    ];
    for (const forbidden of privateKeys) {
      expect(keys).not.toContain(forbidden);
    }
  });
});

describe("event page fields (22/10/2026)", () => {
  it("defaults every new field so older clients and documents stay valid", () => {
    const parsed = eventCreateRequestSchema.parse(base);
    expect(parsed.banner).toBeNull();
    expect(parsed.minAge).toBeNull();
    expect(parsed.benefits).toEqual([]);
    expect(parsed.cancellationRules).toEqual([]);
    expect(parsed.attendanceCount).toBeNull();
  });

  it("fills speaker bio/avatar and agenda description", () => {
    const parsed = eventCreateRequestSchema.parse({
      ...base,
      speakers: [{ name: "Người hướng dẫn" }],
      agenda: [{ time: "09:00", title: "Mở đầu" }],
    });
    expect(parsed.speakers[0]).toEqual({
      name: "Người hướng dẫn",
      role: "",
      bio: "",
      avatar: null,
    });
    expect(parsed.agenda[0]?.description).toBe("");
  });

  it("only accepts benefit icons from the shared list", () => {
    const ok = { icon: BENEFIT_ICONS[0], title: "Tác phẩm mang về" };
    expect(eventCreateRequestSchema.safeParse({ ...base, benefits: [ok] }).success).toBe(true);
    const bad = { icon: "material-symbols", title: "x" };
    expect(eventCreateRequestSchema.safeParse({ ...base, benefits: [bad] }).success).toBe(false);
  });

  it("caps benefits and cancellation rules", () => {
    const benefits = Array.from({ length: EVENT_LIMITS.benefitsMax + 1 }, () => ({
      icon: "leaf",
      title: "x",
    }));
    expect(eventCreateRequestSchema.safeParse({ ...base, benefits }).success).toBe(false);
    const cancellationRules = Array.from({ length: EVENT_LIMITS.cancellationRulesMax + 1 }, () => ({
      condition: "a",
      result: "b",
    }));
    expect(eventCreateRequestSchema.safeParse({ ...base, cancellationRules }).success).toBe(false);
  });

  it("refuses an out-of-range minimum age", () => {
    expect(eventCreateRequestSchema.safeParse({ ...base, minAge: -1 }).success).toBe(false);
    expect(eventCreateRequestSchema.safeParse({ ...base, minAge: 100 }).success).toBe(false);
  });
});

describe("eventCancelRequestSchema", () => {
  it("requires a meaningful public reason", () => {
    expect(eventCancelRequestSchema.safeParse({ reason: "Mưa", revision: 1 }).success).toBe(false);
    expect(
      eventCancelRequestSchema.safeParse({ reason: "Người hướng dẫn bị ốm đột xuất", revision: 1 })
        .success,
    ).toBe(true);
  });
});
