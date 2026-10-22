import { describe, expect, it } from "vitest";

import { serializeJsonLd } from "./json-ld";

describe("serializeJsonLd", () => {
  it("cannot be closed or commented out by a value", () => {
    const out = serializeJsonLd({
      name: "</script><script>alert(1)</script> <!-- & -->",
    });
    expect(out).not.toMatch(/[<>&]/);
    expect(out).toContain("\\u003c/script\\u003e");
  });

  it("stays valid JSON with the same data", () => {
    const data = { "@type": "Event", name: "Tranh <vỏ> & giấy\u2028tái chế", seats: 12 };
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });
});
