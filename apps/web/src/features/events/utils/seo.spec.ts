import { describe, expect, it } from "vitest";

import { DEFAULT_EVENT_BANNER } from "../constants/config";
import { shareImageOf } from "./seo";

const image = (publicId: string) => ({
  mediaId: "64b7f0c2a1b2c3d4e5f60701",
  publicId,
  width: 2000,
  height: 1000,
  alt: "Ảnh",
});

describe("shareImageOf", () => {
  const title = "Workshop";

  it("prefers the banner, then the poster", () => {
    const both = { title, banner: image("lv/banner"), cover: image("lv/poster") };
    expect(shareImageOf(both, "demo").url).toContain("lv/banner");
    expect(shareImageOf({ ...both, banner: null }, "demo").url).toContain("lv/poster");
  });

  it("falls back to the default banner without images or delivery", () => {
    expect(shareImageOf({ title, banner: null, cover: null }, "demo").url).toBe(
      DEFAULT_EVENT_BANNER.url,
    );
    expect(shareImageOf({ title, banner: image("lv/banner"), cover: null }, "").url).toBe(
      DEFAULT_EVENT_BANNER.url,
    );
  });
});
