import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getCatalog } = await import("./catalog");

/** Guards edits of the demo JSON: a broken file must fail here, not in front of a jury. */
describe("LaviAgent demo data", () => {
  const catalog = getCatalog();

  it("validates every file against its schema", () => {
    expect(catalog.materials).toHaveLength(5);
    expect(catalog.ideas.length).toBeGreaterThan(0);
    expect(catalog.kits.length).toBeGreaterThan(0);
  });

  it("offers two or three ideas per material", () => {
    for (const material of catalog.materials) {
      const count = catalog.ideas.filter((idea) => idea.material === material.id).length;
      expect(count, material.id).toBeGreaterThanOrEqual(2);
      expect(count, material.id).toBeLessThanOrEqual(3);
    }
  });

  it("only uses card tokens that point to real ideas and kits", () => {
    const ids = {
      idea: new Set(catalog.ideas.map((idea) => idea.id)),
      kit: new Set(catalog.kits.map((kit) => kit.id)),
    };
    for (const suggestion of catalog.suggestions) {
      for (const [, kind, id] of suggestion.answer.matchAll(/\[\[(idea|kit):([a-z0-9-]+)\]\]/g)) {
        expect(ids[kind as "idea" | "kit"].has(id ?? ""), `${suggestion.id} → ${kind}:${id}`).toBe(
          true,
        );
      }
    }
  });
});
