import { describe, expect, it } from "vitest";

import { editorNavItems } from "./editor-sections";

const poster = {
  mediaId: "64b7f0c2a1b2c3d4e5f60701",
  publicId: "lv/p",
  width: 800,
  height: 1000,
  alt: "Poster",
};

const statusOf = (items: ReturnType<typeof editorNavItems>) =>
  Object.fromEntries(items.map((item) => [item.key, item.status]));

describe("editorNavItems", () => {
  it("marks every section ok when nothing is missing", () => {
    const items = editorNavItems({
      kind: "standard",
      cover: poster,
      readiness: { blockers: [], warnings: [] },
    });
    expect(items.map((item) => item.status)).toEqual(["ok", "ok", "ok", "ok", "ok"]);
  });

  it("points blockers and warnings at their section", () => {
    const items = editorNavItems({
      kind: "standard",
      cover: null,
      readiness: {
        blockers: ["venue_missing", "ticket_type_missing"],
        warnings: ["summary_missing"],
      },
    });
    expect(statusOf(items)).toEqual({
      basics: "attention",
      images: "attention",
      time: "attention",
      tickets: "attention",
      form: "ok",
    });
  });

  it("has no ticket or form section for an archive-only event", () => {
    const items = editorNavItems({
      kind: "past",
      cover: poster,
      readiness: { blockers: [], warnings: [] },
    });
    expect(items.map((item) => item.key)).toEqual(["basics", "images", "time"]);
  });
});
