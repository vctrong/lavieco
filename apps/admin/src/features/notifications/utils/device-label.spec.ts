import { describe, expect, it } from "vitest";

import { deviceLabelOf } from "./device-label";

describe("deviceLabelOf", () => {
  it("names common phones and browsers", () => {
    expect(
      deviceLabelOf(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("iPhone · Safari");
    expect(
      deviceLabelOf(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36",
      ),
    ).toBe("Android · Chrome");
  });

  it("returns an empty label for an unknown agent", () => {
    expect(deviceLabelOf("curl/8.0")).toBe("");
  });
});
