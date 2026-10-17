import { describe, expect, it } from "vitest";

import { exportFileName, safeCell } from "./spreadsheet";

describe("safeCell", () => {
  it("neutralises cells Excel would run as formulas", () => {
    for (const value of ["=1+1", "+84901", "-2", "@SUM(A1)", "\t=x", "\r=x"]) {
      expect(safeCell(value)).toBe(`'${value}`);
    }
  });

  it("leaves ordinary text alone", () => {
    for (const value of ["Nguyễn Văn A", "a@b.vn", "0901 234 567", "", "1=1"]) {
      expect(safeCell(value)).toBe(value);
    }
  });
});

describe("exportFileName", () => {
  it("uses the Vietnamese calendar day", () => {
    expect(exportFileName("workshop-vo-so", new Date("2026-10-19T18:30:00Z"))).toBe(
      "LAVIECO_workshop-vo-so_2026-10-20.xlsx",
    );
  });
});
