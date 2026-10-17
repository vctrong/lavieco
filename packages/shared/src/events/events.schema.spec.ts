import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { formQuestionSchema, eventFormSchema } from "./event-form.schema";
import { eventCreateRequestSchema } from "./event.schema";
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
    for (const forbidden of ["onlineUrl", "createdBy", "updatedBy", "form", "revision", "id"]) {
      expect(keys).not.toContain(forbidden);
    }
  });
});
