import { describe, expect, it } from "vitest";

import { checkImageFile } from "./check-file";
import { deliveryWidthFor, mediaDeliveryUrl } from "./delivery";
import { MEDIA_LIMITS } from "./limits";

describe("checkImageFile (ADR-0020, early client check)", () => {
  it("accepts JPEG, PNG and WebP within the purpose limit", () => {
    expect(checkImageFile({ name: "a.jpg", type: "image/jpeg", size: 1000 }, "avatar")).toBeNull();
    expect(checkImageFile({ name: "a.png", type: "image/png", size: 1000 }, "event_cover")).toBe(
      null,
    );
    expect(checkImageFile({ name: "a.webp", type: "", size: 1000 }, "event_gallery")).toBeNull();
  });

  it("names HEIC, HEIF and AVIF so the UI can explain them", () => {
    expect(checkImageFile({ name: "IMG_1.HEIC", type: "", size: 1 }, "avatar")).toEqual({
      code: "format_refused",
      format: "heic",
    });
    expect(checkImageFile({ name: "photo", type: "image/avif", size: 1 }, "avatar")).toEqual({
      code: "format_refused",
      format: "avif",
    });
  });

  it("refuses SVG and other types", () => {
    expect(checkImageFile({ name: "a.svg", type: "image/svg+xml", size: 1 }, "avatar")).toEqual({
      code: "type_unsupported",
    });
    expect(checkImageFile({ name: "a.pdf", type: "", size: 1 }, "avatar")).toEqual({
      code: "type_unsupported",
    });
  });

  it("applies 2 MB to avatars and 8 MB to event images", () => {
    const size = 3 * 1024 * 1024;
    expect(checkImageFile({ name: "a.jpg", type: "image/jpeg", size }, "avatar")).toEqual({
      code: "too_large",
      maxBytes: MEDIA_LIMITS.maxBytes.avatar,
    });
    expect(checkImageFile({ name: "a.jpg", type: "image/jpeg", size }, "event_cover")).toBeNull();
  });
});

describe("delivery URLs", () => {
  it("rounds up to an allowed named transformation", () => {
    expect(deliveryWidthFor(1)).toBe(96);
    expect(deliveryWidthFor(500)).toBe(640);
    expect(deliveryWidthFor(5000)).toBe(1920);
  });

  it("never points at the original asset", () => {
    expect(
      mediaDeliveryUrl({ cloudName: "demo", publicId: "lavieco/dev/events/abc", width: 700 }),
    ).toBe("https://res.cloudinary.com/demo/image/private/t_lv_w960/lavieco/dev/events/abc");
  });
});
