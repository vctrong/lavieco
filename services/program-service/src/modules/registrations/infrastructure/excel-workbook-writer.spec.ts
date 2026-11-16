import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import type { Workbook } from "../application/workbook";
import { ExcelWorkbookWriter } from "./excel-workbook-writer";
import { SHEET_COLORS } from "./sheet-tokens";

async function read(book: Workbook) {
  const bytes = await new ExcelWorkbookWriter().write(book);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  );
  return workbook;
}

const BOOK: Workbook = {
  fileName: "LAVIECO_test.xlsx",
  table: {
    name: "Người đăng ký",
    columns: [
      { header: "STT", kind: "index" },
      { header: "Họ tên", kind: "text" },
      { header: "Số điện thoại", kind: "code" },
      { header: "Thanh toán", kind: "status", tones: { "Đã thanh toán": "ok" } },
      { header: "Thời gian đăng ký", kind: "dateTime" },
      { header: "Giảm giá", kind: "money" },
      { header: "Bạn mong đợi điều gì?", kind: "longText" },
    ],
    rows: [
      [1, "=cmd()", "0912345678", "Đã thanh toán", new Date("2026-10-18T02:18:00Z"), 15000, "Ngắn"],
      [
        2,
        "Trần B",
        "0987654321",
        "Chờ thanh toán",
        new Date("2026-10-18T03:00:00Z"),
        null,
        "x ".repeat(80),
      ],
    ],
  },
  summary: {
    name: "Tổng quan",
    title: "Workshop vỏ sò",
    lines: [
      ["Tổng số vé", 2],
      ["Xuất lúc", new Date("2026-10-18T05:00:00Z")],
    ],
  },
};

describe("ExcelWorkbookWriter", () => {
  it("writes typed cells: numbers, VND, Vietnam-time dates, phone as text", async () => {
    const sheet = (await read(BOOK)).worksheets[0]!;
    const row = sheet.getRow(2);
    expect(row.getCell(1).value).toBe(1);
    expect(row.getCell(3).value).toBe("0912345678");
    expect(row.getCell(3).numFmt).toBe("@");
    expect(row.getCell(5).value).toEqual(new Date("2026-10-18T09:18:00Z"));
    expect(row.getCell(5).numFmt).toBe("dd/mm/yyyy hh:mm");
    expect(row.getCell(6).value).toBe(15000);
    expect(row.getCell(6).numFmt).toBe('#,##0" ₫"');
  });

  it("neutralises formulas in text cells", async () => {
    const sheet = (await read(BOOK)).worksheets[0]!;
    expect(sheet.getRow(2).getCell(2).value).toBe("'=cmd()");
  });

  it("styles the header, freezes it with the name column and adds filters", async () => {
    const sheet = (await read(BOOK)).worksheets[0]!;
    const header = sheet.getRow(1).getCell(1);
    expect(header.font?.bold).toBe(true);
    expect(header.fill).toMatchObject({ fgColor: { argb: SHEET_COLORS.deepBlue } });
    expect(sheet.views[0]).toMatchObject({ state: "frozen", ySplit: 1, xSplit: 2 });
    expect(sheet.autoFilter).toBeTruthy();
  });

  it("colours a known status and leaves the others plain", async () => {
    const sheet = (await read(BOOK)).worksheets[0]!;
    expect(sheet.getRow(2).getCell(4).fill).toMatchObject({
      fgColor: { argb: SHEET_COLORS.mint },
    });
    expect(sheet.getRow(3).getCell(4).font?.color?.argb).toBe(SHEET_COLORS.charcoal);
  });

  it("gives long answers taller rows and bounded column widths", async () => {
    const sheet = (await read(BOOK)).worksheets[0]!;
    expect(sheet.getRow(3).height).toBeGreaterThan(sheet.getRow(2).height ?? 0);
    expect(sheet.getColumn(7).width).toBeLessThanOrEqual(45);
  });

  it("adds the summary sheet", async () => {
    const summary = (await read(BOOK)).worksheets[1]!;
    expect(summary.name).toBe("Tổng quan");
    expect(summary.getRow(1).getCell(1).value).toBe("Workshop vỏ sò");
    expect(summary.getRow(3).getCell(2).value).toBe(2);
    expect(summary.getRow(4).getCell(2).value).toEqual(new Date("2026-10-18T12:00:00Z"));
  });
});
