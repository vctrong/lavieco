import { describe, expect, it } from "vitest";

import { eventCreateRequestSchema } from "@lavieco/shared/events";

import { fieldErrorsOf } from "../schemas";
import { emptyDetails, savedImageIds, toDetailsRequest } from "./details-values";

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

describe("event images in the details form (ADR-0020)", () => {
  const image = (mediaId: string, alt: string) => ({
    mediaId,
    publicId: `lavieco/dev/events/${mediaId}`,
    width: 1600,
    height: 900,
    alt,
  });

  it("sends only media ids and alt text, never file details", () => {
    const body = toDetailsRequest({
      ...emptyDetails(TYPE_ID),
      title: "Có ảnh",
      startLocal: "2026-11-15T09:00",
      endLocal: "2026-11-15T12:00",
      cover: image("64b7f0c2a1b2c3d4e5f60701", "Ảnh bìa"),
      gallery: [image("64b7f0c2a1b2c3d4e5f60702", "Thành phẩm")],
    });
    expect(body.cover).toEqual({ mediaId: "64b7f0c2a1b2c3d4e5f60701", alt: "Ảnh bìa" });
    expect(body.gallery).toEqual([{ mediaId: "64b7f0c2a1b2c3d4e5f60702", alt: "Thành phẩm" }]);
    expect(eventCreateRequestSchema.safeParse(body).success).toBe(true);
  });

  it("asks for alt text on every image", () => {
    const body = toDetailsRequest({
      ...emptyDetails(TYPE_ID),
      title: "Thiếu mô tả",
      startLocal: "2026-11-15T09:00",
      endLocal: "2026-11-15T12:00",
      gallery: [image("64b7f0c2a1b2c3d4e5f60703", "")],
    });
    const result = eventCreateRequestSchema.safeParse(body);
    expect(result.success).toBe(false);
    if (!result.success)
      expect(Object.keys(fieldErrorsOf(result.error))).toContain("gallery.0.alt");
  });

  it("knows which images are already saved", () => {
    expect(savedImageIds(null).size).toBe(0);
  });
});

describe("event page fields (22/10/2026)", () => {
  const base = {
    ...emptyDetails(TYPE_ID),
    title: "Trang mới",
    startLocal: "2026-11-15T09:00",
    endLocal: "2026-11-15T12:00",
  };
  const image = (mediaId: string, alt: string) => ({
    mediaId,
    publicId: `lavieco/dev/events/${mediaId}`,
    width: 800,
    height: 800,
    alt,
  });

  it("sends banner, minimum age, benefits, rules and portraits as the contract expects", () => {
    const body = toDetailsRequest({
      ...base,
      minAge: "12",
      banner: image("64b7f0c2a1b2c3d4e5f60704", "Toàn cảnh xưởng"),
      benefits: [{ icon: "award", title: "Tác phẩm mang về", description: "" }],
      cancellationRules: [{ condition: "Trước 72 giờ", result: "Hoàn 100%" }],
      speakers: [
        {
          name: "Người hướng dẫn",
          role: "Nghệ sĩ",
          bio: "Tám năm làm vật liệu tái chế.",
          avatar: image("64b7f0c2a1b2c3d4e5f60705", "Chân dung"),
        },
      ],
    });
    const parsed = eventCreateRequestSchema.parse(body);
    expect(parsed.minAge).toBe(12);
    expect(parsed.banner).toEqual({ mediaId: "64b7f0c2a1b2c3d4e5f60704", alt: "Toàn cảnh xưởng" });
    expect(parsed.speakers[0]?.avatar).toEqual({
      mediaId: "64b7f0c2a1b2c3d4e5f60705",
      alt: "Chân dung",
    });
    expect(parsed.cancellationRules).toHaveLength(1);
  });

  it("sends a typed attendance only for an archive-only event", () => {
    expect(toDetailsRequest({ ...base, attendanceCount: "40" }).attendanceCount).toBeNull();
    expect(toDetailsRequest({ ...base, kind: "past", attendanceCount: "40" }).attendanceCount).toBe(
      40,
    );
    expect(toDetailsRequest({ ...base, minAge: "" }).minAge).toBeNull();
  });
});
