import { describe, expect, it } from "vitest";

import { HANDBOOK_LIMITS } from "./handbook.limits";
import {
  handbookHotspotSchema,
  handbookImportCreateSchema,
  handbookPublishRequestSchema,
  handbookUploadCreateSchema,
} from "./handbook.schema";
import { handbookVideoEmbedUrl, parseHandbookVideoUrl } from "./handbook-video";

const spot = {
  id: "8f6c1c1e-6a8f-4d0e-9a51-3d0c7c1f2b11",
  x: 10,
  y: 20,
  w: 30,
  h: 15,
  label: "Xem bộ KIT",
  target: { type: "url", url: "https://lavieco.io.vn" },
};

describe("handbook hotspot", () => {
  it("accepts a rectangle inside the page", () => {
    expect(handbookHotspotSchema.safeParse(spot).success).toBe(true);
  });

  it("refuses a rectangle that leaves the page", () => {
    expect(handbookHotspotSchema.safeParse({ ...spot, x: 80, w: 30 }).success).toBe(false);
  });

  it("refuses a plain http link", () => {
    const target = { type: "url", url: "http://example.com" };
    expect(handbookHotspotSchema.safeParse({ ...spot, target }).success).toBe(false);
  });

  it("accepts only YouTube and TikTok videos", () => {
    const youtube = { type: "video", url: "https://youtu.be/dQw4w9WgXcQ" };
    const vimeo = { type: "video", url: "https://vimeo.com/123456" };
    expect(handbookHotspotSchema.safeParse({ ...spot, target: youtube }).success).toBe(true);
    expect(handbookHotspotSchema.safeParse({ ...spot, target: vimeo }).success).toBe(false);
  });
});

describe("parseHandbookVideoUrl", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ])("reads the YouTube id of %s", (url, id) => {
    expect(parseHandbookVideoUrl(url)).toEqual({ provider: "youtube", id });
  });

  it("reads a TikTok video id", () => {
    expect(
      parseHandbookVideoUrl("https://www.tiktok.com/@lavieco/video/7234567890123456789"),
    ).toEqual({ provider: "tiktok", id: "7234567890123456789" });
  });

  it("refuses other hosts and malformed ids", () => {
    expect(parseHandbookVideoUrl("https://evil.example/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseHandbookVideoUrl("https://www.youtube.com/watch?v=short")).toBeNull();
    expect(parseHandbookVideoUrl("not a url")).toBeNull();
  });

  it("embeds YouTube through the privacy-enhanced domain", () => {
    expect(handbookVideoEmbedUrl({ provider: "youtube", id: "dQw4w9WgXcQ" })).toContain(
      "youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
  });
});

describe("handbook requests", () => {
  it("requires a release note to publish", () => {
    const base = { revision: 3, actorName: "Lan" };
    expect(handbookPublishRequestSchema.safeParse({ ...base, note: "" }).success).toBe(false);
    expect(handbookPublishRequestSchema.safeParse({ ...base, note: "Thay trang 12" }).success).toBe(
      true,
    );
  });

  it("caps a PDF and an image at their own sizes", () => {
    const pdf = { kind: "pdf", fileName: "so.pdf", size: HANDBOOK_LIMITS.pdfMaxBytes };
    const image = { kind: "image", fileName: "p1.png", size: HANDBOOK_LIMITS.pdfMaxBytes };
    expect(handbookUploadCreateSchema.safeParse(pdf).success).toBe(true);
    expect(handbookUploadCreateSchema.safeParse(image).success).toBe(false);
  });

  it("replaces a page with exactly one file", () => {
    const base = {
      revision: 1,
      mode: "replace_page",
      pageId: "8f6c1c1e-6a8f-4d0e-9a51-3d0c7c1f2b11",
    };
    const id = "0123456789abcdef01234567";
    expect(handbookImportCreateSchema.safeParse({ ...base, uploadIds: [id] }).success).toBe(true);
    expect(handbookImportCreateSchema.safeParse({ ...base, uploadIds: [id, id] }).success).toBe(
      false,
    );
  });
});
