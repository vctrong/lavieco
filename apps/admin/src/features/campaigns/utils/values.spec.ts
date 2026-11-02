import { describe, expect, it } from "vitest";

import { campaignCreateRequestSchema } from "@lavieco/shared/events";

import { emptyValues, parseManualList, toCampaignRequest } from "./values";

const EVENT = "e".repeat(24);

describe("parseManualList", () => {
  it("reads emails with or without a name, and counts bad lines", () => {
    expect(
      parseManualList(
        "a@example.test\nb@example.test,Bình An\n\nkhong-phai-email\nc@example.test;C",
      ),
    ).toEqual({
      entries: [
        { email: "a@example.test", name: "" },
        { email: "b@example.test", name: "Bình An" },
        { email: "c@example.test", name: "C" },
      ],
      bad: 1,
    });
  });
});

describe("toCampaignRequest", () => {
  it("builds a valid request for an event's buyers, using that event for the variables", () => {
    const body = toCampaignRequest({
      ...emptyValues(),
      name: "Cảm ơn",
      audienceEventId: EVENT,
      checkin: "checked_in",
    });
    const parsed = campaignCreateRequestSchema.parse(body);
    expect(parsed.eventId).toBe(EVENT);
    expect(parsed.audience).toMatchObject({ type: "event", checkin: "checked_in" });
    expect(parsed.cta).toBeNull();
  });

  it("needs an address for a link button, not for a personal one", () => {
    const base = { ...emptyValues(), name: "X", audienceEventId: EVENT, ctaLabel: "Mở" };
    expect(
      campaignCreateRequestSchema.safeParse(toCampaignRequest({ ...base, ctaChoice: "url" }))
        .success,
    ).toBe(false);
    expect(
      campaignCreateRequestSchema.safeParse(toCampaignRequest({ ...base, ctaChoice: "survey" }))
        .success,
    ).toBe(true);
  });

  it("turns a purchase period into whole Vietnam days", () => {
    const body = toCampaignRequest({
      ...emptyValues(),
      name: "X",
      audienceType: "past_buyers",
      from: "2026-11-02",
      to: "2026-11-02",
    });
    expect(body.audience).toMatchObject({
      from: "2026-11-01T17:00:00.000Z",
      to: "2026-11-02T16:59:59.999Z",
    });
  });

  it("refuses an empty pasted list", () => {
    const body = toCampaignRequest({ ...emptyValues(), name: "X", audienceType: "manual" });
    expect(campaignCreateRequestSchema.safeParse(body).success).toBe(false);
  });
});
