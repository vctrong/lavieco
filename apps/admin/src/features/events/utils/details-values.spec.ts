import { describe, expect, it } from "vitest";

import { eventCreateRequestSchema } from "@lavieco/shared/events";

import { fieldErrorsOf } from "../schemas";
import { emptyDetails, toDetailsRequest } from "./details-values";

const TYPE_ID = "64b7f0c2a1b2c3d4e5f60718";

describe("toDetailsRequest", () => {
  it("builds a valid offline request in Vietnam time", () => {
    const body = toDetailsRequest({
      ...emptyDetails(TYPE_ID),
      title: "Workshop vỏ sò",
      startLocal: "2026-11-15T09:00",
      endLocal: "2026-11-15T12:00",
      venueName: "Xưởng LAVIECO",
      venueAddress: "Ninh Kiều, Cần Thơ",
      onlineUrl: "https://ignored.example",
    });
    const parsed = eventCreateRequestSchema.parse(body);
    expect(parsed.startAt).toBe("2026-11-15T02:00:00.000Z");
    expect(parsed.venue).toEqual({
      name: "Xưởng LAVIECO",
      address: "Ninh Kiều, Cần Thơ",
      mapUrl: null,
    });
    // An offline event never keeps an online link.
    expect(parsed.onlineUrl).toBeNull();
  });

  it("drops the venue of an online event and reports errors in Vietnamese", () => {
    const body = toDetailsRequest({
      ...emptyDetails(TYPE_ID),
      format: "online",
      venueName: "Bỏ qua",
      onlineUrl: "zoom.us/abc",
      startLocal: "2026-11-15T09:00",
      endLocal: "2026-11-15T08:00",
    });
    expect(body.venue).toBeNull();
    const result = eventCreateRequestSchema.safeParse(body);
    expect(result.success).toBe(false);
    const errors = fieldErrorsOf(result.error!);
    expect(errors.title).toBe("Không được để trống.");
    expect(errors.onlineUrl).toBe("Link phải bắt đầu bằng http:// hoặc https://.");
  });
});
