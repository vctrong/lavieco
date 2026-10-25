import { describe, expect, it } from "vitest";

import { parseInline, parseMiniMarkdown } from "./mini-markdown";

describe("parseMiniMarkdown", () => {
  it("reads paragraphs, bullet and numbered lists", () => {
    const blocks = parseMiniMarkdown(
      "Mở đầu\ndòng hai\n\n- một\n- hai\n\n1. bước một\n2. bước hai",
    );
    expect(blocks.map((block) => block.type)).toEqual(["paragraph", "list", "list"]);
    expect(blocks[0]).toMatchObject({
      type: "paragraph",
      lines: [[{ text: "Mở đầu" }], [{ text: "dòng hai" }]],
    });
    expect(blocks[1]).toMatchObject({
      ordered: false,
      items: [[{ text: "một" }], [{ text: "hai" }]],
    });
    expect(blocks[2]).toMatchObject({ ordered: true });
  });

  it("keeps HTML as plain text", () => {
    expect(parseMiniMarkdown("<img src=x onerror=alert(1)>")).toEqual([
      { type: "paragraph", lines: [[{ text: "<img src=x onerror=alert(1)>", bold: false }]] },
    ]);
  });
});

describe("parseInline", () => {
  it("marks **bold** and leaves stray asterisks", () => {
    expect(parseInline("Dùng **keo sữa** nhé *")).toEqual([
      { text: "Dùng ", bold: false },
      { text: "keo sữa", bold: true },
      { text: " nhé *", bold: false },
    ]);
  });

  it("drops heading markers", () => {
    expect(parseInline("## Mẹo")).toEqual([{ text: "Mẹo", bold: false }]);
  });
});
