import { describe, expect, it } from "vitest";

import { publicEnv } from "./env.public";
import { siteUrl } from "./site-url";

describe("siteUrl", () => {
  it("builds redirects on the configured public origin, not the request host", () => {
    const url = siteUrl("/dang-ky?loi=google");
    expect(url.origin).toBe(new URL(publicEnv.siteUrl).origin);
    expect(`${url.pathname}${url.search}`).toBe("/dang-ky?loi=google");
  });
});
