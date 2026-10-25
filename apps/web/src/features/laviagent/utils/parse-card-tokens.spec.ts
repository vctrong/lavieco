import { describe, expect, it } from "vitest";

import { parseCardTokens } from "./parse-card-tokens";

const known = {
  ideas: new Set(["chau-cay-tu-duong", "den-lon-nhom"]),
  kits: new Set(["kit-chau-tu-duong"]),
};

describe("parseCardTokens", () => {
  it("splits text and known cards in order", () => {
    expect(
      parseCardTokens(
        "Thử nhé:\n[[idea:chau-cay-tu-duong]]\nCần KIT? [[kit:kit-chau-tu-duong]]",
        known,
      ),
    ).toEqual([
      { type: "text", text: "Thử nhé:\n" },
      { type: "idea", id: "chau-cay-tu-duong" },
      { type: "text", text: "\nCần KIT? " },
      { type: "kit", id: "kit-chau-tu-duong" },
    ]);
  });

  it("drops ids that do not exist (the model must not invent cards)", () => {
    expect(parseCardTokens("A [[idea:khong-co]] B [[kit:gia-mao]]", known)).toEqual([
      { type: "text", text: "A  B " },
    ]);
  });

  it("shows the same card once", () => {
    const segments = parseCardTokens("[[idea:den-lon-nhom]] và [[idea:den-lon-nhom]]", known);
    expect(segments.filter((segment) => segment.type === "idea")).toHaveLength(1);
  });

  it("hides a token still being streamed", () => {
    expect(parseCardTokens("Xem nè [[idea:chau-ca", known, true)).toEqual([
      { type: "text", text: "Xem nè " },
    ]);
    expect(parseCardTokens("Xem nè [[", known, true)).toEqual([{ type: "text", text: "Xem nè " }]);
  });

  it("keeps a complete token at the end of a streaming answer", () => {
    expect(parseCardTokens("[[idea:den-lon-nhom]]", known, true)).toEqual([
      { type: "idea", id: "den-lon-nhom" },
    ]);
  });
});
