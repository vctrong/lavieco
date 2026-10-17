import { describe, expect, it } from "vitest";

import { DomainError } from "@lavieco/shared";

import { sniffImageFormat } from "./image-format";
import {
  assertUploadSize,
  attachDecision,
  pendingCutoff,
  publicIdFor,
  releaseDecision,
  type MediaRecord,
} from "./media";

const bytes = (...values: number[]) => new Uint8Array(values);
const text = (value: string) => new TextEncoder().encode(value);

/** An ISO-BMFF `ftyp` box with the given major and compatible brands. */
function ftyp(major: string, ...compatible: string[]) {
  const size = 16 + compatible.length * 4;
  const box = new Uint8Array(size);
  new DataView(box.buffer).setUint32(0, size);
  box.set(text("ftyp"), 4);
  box.set(text(major), 8);
  compatible.forEach((brand, index) => box.set(text(brand), 16 + index * 4));
  return box;
}

describe("sniffImageFormat (ADR-0020: real content, not the name)", () => {
  it("recognises JPEG, PNG and WebP", () => {
    expect(sniffImageFormat(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0))).toEqual({
      kind: "accepted",
      format: "jpeg",
    });
    expect(sniffImageFormat(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toEqual({
      kind: "accepted",
      format: "png",
    });
    const webp = new Uint8Array(16);
    webp.set(text("RIFF"), 0);
    webp.set(text("WEBP"), 8);
    expect(sniffImageFormat(webp)).toEqual({ kind: "accepted", format: "webp" });
  });

  it("names HEIC, HEIF and AVIF instead of a generic refusal", () => {
    expect(sniffImageFormat(ftyp("heic", "mif1", "heic"))).toEqual({
      kind: "refused",
      format: "heic",
    });
    expect(sniffImageFormat(ftyp("mif1", "mif1"))).toEqual({ kind: "refused", format: "heif" });
    expect(sniffImageFormat(ftyp("avif", "mif1", "miaf"))).toEqual({
      kind: "refused",
      format: "avif",
    });
    // AVIF declared only among the compatible brands is still AVIF.
    expect(sniffImageFormat(ftyp("mif1", "avif"))).toEqual({ kind: "refused", format: "avif" });
  });

  it("refuses SVG, GIF, PDF, MP4 and empty content", () => {
    expect(sniffImageFormat(text('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    expect(sniffImageFormat(text("GIF89a......"))).toBeNull();
    expect(sniffImageFormat(text("%PDF-1.7 ......"))).toBeNull();
    expect(sniffImageFormat(ftyp("isom", "mp41"))).toBeNull();
    expect(sniffImageFormat(new Uint8Array())).toBeNull();
  });
});

function record(overrides: Partial<MediaRecord> = {}): MediaRecord {
  const now = new Date();
  return {
    id: "64b7f0c2a1b2c3d4e5f60719",
    purpose: "event_cover",
    status: "pending",
    publicId: "lavieco/dev/events/64b7f0c2a1b2c3d4e5f60719",
    width: 800,
    height: 600,
    bytes: 1000,
    format: "jpeg",
    sha256: "x",
    owner: null,
    attachedTo: null,
    uploadedBy: { kind: "staff", userId: "64b7f0c2a1b2c3d4e5f60700" },
    deletedAt: null,
    storageDeletedAt: null,
    eraseAfterDestroy: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const eventA = { kind: "event", id: "64b7f0c2a1b2c3d4e5f6070a" } as const;
const eventB = { kind: "event", id: "64b7f0c2a1b2c3d4e5f6070b" } as const;
const codeOf = (run: () => unknown) => {
  try {
    run();
  } catch (error) {
    return error instanceof DomainError ? error.code : "other";
  }
  return null;
};

describe("attach and release (one image, one event)", () => {
  it("attaches a pending image, then is idempotent for the same event", () => {
    expect(attachDecision(record(), eventA)).toBe("attach");
    const attached = record({
      status: "attached",
      attachedTo: { service: "program-service", ...eventA },
    });
    expect(attachDecision(attached, eventA)).toBe("already_attached");
  });

  it("refuses an image of another event, a deleted one, an avatar or a missing one", () => {
    const elsewhere = record({
      status: "attached",
      attachedTo: { service: "program-service", ...eventB },
    });
    expect(codeOf(() => attachDecision(elsewhere, eventA))).toBe("media.unavailable");
    expect(codeOf(() => attachDecision(record({ status: "deleted" }), eventA))).toBe(
      "media.unavailable",
    );
    expect(codeOf(() => attachDecision(record({ purpose: "avatar" }), eventA))).toBe(
      "media.unavailable",
    );
    expect(codeOf(() => attachDecision(null, eventA))).toBe("media.unavailable");
  });

  it("lets only the holder release; releasing twice is a no-op", () => {
    const attached = record({
      status: "attached",
      attachedTo: { service: "program-service", ...eventA },
    });
    expect(releaseDecision(attached, eventA)).toBe("release");
    expect(codeOf(() => releaseDecision(attached, eventB))).toBe("media.unavailable");
    expect(releaseDecision(record({ status: "deleted" }), eventA)).toBe("nothing_to_do");
    expect(releaseDecision(null, eventA)).toBe("nothing_to_do");
    expect(releaseDecision(record(), eventB)).toBe("release");
  });
});

describe("limits and naming", () => {
  it("caps avatars at 2 MB and event images at 8 MB", () => {
    const threeMb = 3 * 1024 * 1024;
    expect(codeOf(() => assertUploadSize("avatar", threeMb))).toBe("media.too_large");
    expect(codeOf(() => assertUploadSize("event_cover", threeMb))).toBeNull();
    expect(codeOf(() => assertUploadSize("event_gallery", 9 * 1024 * 1024))).toBe(
      "media.too_large",
    );
  });

  it("keeps dev and prod files apart and names them after the media id", () => {
    expect(publicIdFor("lavieco/dev", "event_gallery", "abc")).toBe("lavieco/dev/events/abc");
    expect(publicIdFor("lavieco/prod", "avatar", "abc")).toBe("lavieco/prod/avatars/abc");
  });

  it("treats uploads older than 24 hours as abandoned", () => {
    const now = new Date("2026-10-18T12:00:00.000Z");
    expect(pendingCutoff(now).toISOString()).toBe("2026-10-17T12:00:00.000Z");
  });
});
