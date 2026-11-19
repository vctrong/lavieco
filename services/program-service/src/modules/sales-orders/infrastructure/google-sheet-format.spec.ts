import { describe, expect, it } from "vitest";

import { buildSheetTabs } from "../application/sheet-export";
import { formatRequests, rgbOf } from "./google-sheet-format";

const [donHang] = buildSheetTabs([], [], new Date("2026-11-20T02:30:00Z"), ["Võ Chí Trọng"]);

describe("formatRequests", () => {
  const requests = formatRequests(donHang!, { sheetId: 7, conditionalFormats: 2 }) as Record<
    string,
    Record<string, unknown>
  >[];

  it("writes the title big and the read-only note small, on the same merged row", () => {
    const title = requests.find((r) => r.updateCells)!.updateCells as {
      rows: {
        values: { textFormatRuns: { startIndex: number; format: { fontSize: number } }[] }[];
      }[];
    };
    const runs = title.rows[0]!.values[0]!.textFormatRuns;
    expect(runs[0]).toMatchObject({ startIndex: 0, format: { fontSize: 16 } });
    expect(runs[1]!.startIndex).toBe(donHang!.title.main.length);
    expect(runs[1]!.format.fontSize).toBeLessThan(16);
    expect(requests.some((r) => r.mergeCells)).toBe(true);
  });

  it("replaces the tab's old rules and dropdowns before adding its own", () => {
    const deletes = requests.filter((r) => r.deleteConditionalFormatRule);
    expect(deletes.map((r) => (r.deleteConditionalFormatRule as { index: number }).index)).toEqual([
      1, 0,
    ]);
    expect(requests.findIndex((r) => r.setDataValidation)).toBeLessThan(
      requests.findIndex((r) => r.mergeCells),
    );
    const assignee = requests
      .map(
        (r) => r.setDataValidation as { rule?: { condition: { values: unknown[] } } } | undefined,
      )
      .find((v) => v?.rule && JSON.stringify(v.rule).includes("Võ Chí Trọng"));
    expect(assignee).toBeDefined();
  });

  it("freezes the title and header rows", () => {
    expect(JSON.stringify(requests[0])).toContain('"frozenRowCount":2');
  });
});

describe("rgbOf", () => {
  it("turns an ARGB token into API floats", () => {
    expect(rgbOf("FF20345F")).toEqual({ red: 0.125, green: 0.204, blue: 0.373 });
  });
});
