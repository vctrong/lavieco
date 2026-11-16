import { PassThrough } from "node:stream";

import ExcelJS from "exceljs";

import type {
  SheetCell,
  SheetColumn,
  SheetColumnKind,
  SheetSummary,
  SheetTable,
  SheetTone,
  Workbook,
  WorkbookWriter,
} from "../application/workbook";
import { safeCell, vietnamWallClock } from "../domain/spreadsheet";
import { SHEET_COLORS } from "./sheet-tokens";

type Look = {
  /** Column width in characters: fitted to the content, kept between these bounds. */
  minWidth: number;
  maxWidth: number;
  numFmt: string;
  horizontal: "left" | "center" | "right";
  wrap: boolean;
};

/** `@` keeps phone numbers and codes as typed (no lost leading 0, no 1.2E+9). */
const LOOK: Record<SheetColumnKind, Look> = {
  index: { minWidth: 5, maxWidth: 7, numFmt: "0", horizontal: "center", wrap: false },
  text: { minWidth: 12, maxWidth: 30, numFmt: "@", horizontal: "left", wrap: true },
  longText: { minWidth: 18, maxWidth: 45, numFmt: "@", horizontal: "left", wrap: true },
  code: { minWidth: 10, maxWidth: 22, numFmt: "@", horizontal: "left", wrap: false },
  number: { minWidth: 7, maxWidth: 12, numFmt: "0", horizontal: "center", wrap: false },
  money: { minWidth: 12, maxWidth: 16, numFmt: '#,##0" ₫"', horizontal: "right", wrap: false },
  dateTime: {
    minWidth: 17,
    maxWidth: 17,
    numFmt: "dd/mm/yyyy hh:mm",
    horizontal: "center",
    wrap: false,
  },
  status: { minWidth: 13, maxWidth: 18, numFmt: "@", horizontal: "center", wrap: false },
};

const TONE: Record<SheetTone, { font: string; fill: string | null }> = {
  ok: { font: SHEET_COLORS.emeraldInk, fill: SHEET_COLORS.mint },
  warn: { font: SHEET_COLORS.charcoal, fill: SHEET_COLORS.canarySoft },
  muted: { font: SHEET_COLORS.muted, fill: null },
  bad: { font: SHEET_COLORS.error, fill: null },
};

const FONT = "Arial";
const LINE_HEIGHT = 15;
/** A long answer shows up to this many lines; the full text is still in the cell. */
const MAX_LINES = 6;

const solid = (argb: string): ExcelJS.Fill => ({
  type: "pattern",
  pattern: "solid",
  fgColor: { argb },
});
const hairline: Partial<ExcelJS.Border> = { style: "thin", color: { argb: SHEET_COLORS.hairline } };
const BORDER: Partial<ExcelJS.Borders> = {
  top: hairline,
  bottom: hairline,
  left: hairline,
  right: hairline,
};

/** Characters a cell shows once formatted, to size its column. */
function shownLength(value: SheetCell, kind: SheetColumnKind): number {
  if (value === null) return 0;
  if (value instanceof Date) return 16;
  if (typeof value === "number") {
    return kind === "money" ? value.toLocaleString("vi-VN").length + 2 : String(value).length;
  }
  return Math.max(...value.split("\n").map((line) => line.length));
}

/** Lines a wrapped value takes at this width (rough: one character ≈ one width unit). */
function linesOf(value: SheetCell, width: number): number {
  if (typeof value !== "string" || value === "") return 1;
  return value
    .split("\n")
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / Math.max(1, width - 1))), 0);
}

function widthOf(column: SheetColumn, rows: readonly SheetCell[][], index: number): number {
  const look = LOOK[column.kind];
  // The header wraps, so only its longest word must fit on one line.
  const header = Math.max(...column.header.split(/\s+/).map((word) => word.length));
  const content = Math.max(0, ...rows.map((row) => shownLength(row[index] ?? null, column.kind)));
  return Math.min(look.maxWidth, Math.max(look.minWidth, header + 2, content + 2));
}

/** Text is guarded against formulas here too, so no export can forget it. */
function cellValue(value: SheetCell, kind: SheetColumnKind): ExcelJS.CellValue {
  if (value === null) return null;
  if (value instanceof Date) return vietnamWallClock(value);
  if (typeof value === "number") return value;
  if (kind === "number" || kind === "index") {
    const parsed = Number(value);
    if (value.trim() !== "" && Number.isFinite(parsed)) return parsed;
  }
  return safeCell(value);
}

function writeTable(book: ExcelJS.stream.xlsx.WorkbookWriter, table: SheetTable) {
  const widths = table.columns.map((column, index) => widthOf(column, table.rows, index));
  const sheet = book.addWorksheet(table.name, {
    // Header row and the first two columns (STT, name) stay visible while scrolling.
    views: [{ state: "frozen", ySplit: 1, xSplit: Math.min(2, table.columns.length) }],
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
    properties: { defaultRowHeight: LINE_HEIGHT + 3 },
  });
  sheet.columns = table.columns.map((column, index) => ({
    key: String(index),
    width: widths[index],
  }));
  if (table.columns.length > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: table.columns.length },
    };
  }

  const header = sheet.getRow(1);
  let headerLines = 1;
  table.columns.forEach((column, index) => {
    const cell = header.getCell(index + 1);
    cell.value = column.header;
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: SHEET_COLORS.white } };
    cell.fill = solid(SHEET_COLORS.deepBlue);
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = BORDER;
    headerLines = Math.max(headerLines, linesOf(column.header, widths[index] ?? 10));
  });
  header.height = Math.min(3, headerLines) * LINE_HEIGHT + 10;
  header.commit();

  table.rows.forEach((values, rowIndex) => {
    const row = sheet.getRow(rowIndex + 2);
    const band = rowIndex % 2 === 1 ? solid(SHEET_COLORS.softWhite) : null;
    let lines = 1;
    table.columns.forEach((column, index) => {
      const look = LOOK[column.kind];
      const value = values[index] ?? null;
      const cell = row.getCell(index + 1);
      cell.value = cellValue(value, column.kind);
      cell.numFmt = look.numFmt;
      cell.border = BORDER;
      cell.alignment = { horizontal: look.horizontal, vertical: "top", wrapText: look.wrap };
      const tone = typeof value === "string" ? column.tones?.[value] : undefined;
      const style = tone ? TONE[tone] : null;
      cell.font = {
        name: FONT,
        size: 10,
        bold: tone === "ok" || tone === "bad",
        color: { argb: style?.font ?? SHEET_COLORS.charcoal },
      };
      const fill = style?.fill ? solid(style.fill) : band;
      if (fill) cell.fill = fill;
      if (look.wrap) lines = Math.max(lines, linesOf(value, widths[index] ?? 10));
    });
    // Excel does not grow rows for wrapped text in a generated file: size them here.
    if (lines > 1) row.height = Math.min(MAX_LINES, lines) * LINE_HEIGHT + 3;
    row.commit();
  });
  sheet.commit();
}

function writeSummary(book: ExcelJS.stream.xlsx.WorkbookWriter, summary: SheetSummary) {
  const sheet = book.addWorksheet(summary.name, {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1 },
  });
  sheet.columns = [
    { key: "label", width: 28 },
    { key: "value", width: 40 },
  ];
  const title = sheet.getRow(1);
  title.getCell(1).value = safeCell(summary.title);
  title.getCell(1).font = {
    name: FONT,
    size: 14,
    bold: true,
    color: { argb: SHEET_COLORS.deepBlue },
  };
  title.getCell(1).alignment = { vertical: "middle", wrapText: true };
  title.height = 28;
  sheet.mergeCells(1, 1, 1, 2);
  title.commit();
  sheet.getRow(2).commit();

  summary.lines.forEach(([label, value], index) => {
    const row = sheet.getRow(index + 3);
    const name = row.getCell(1);
    name.value = safeCell(label);
    name.font = { name: FONT, size: 10, bold: true, color: { argb: SHEET_COLORS.charcoal } };
    name.border = BORDER;
    name.fill = solid(SHEET_COLORS.softWhite);
    const cell = row.getCell(2);
    cell.value = value instanceof Date ? vietnamWallClock(value) : cellValue(value, "text");
    cell.numFmt =
      value instanceof Date ? LOOK.dateTime.numFmt : typeof value === "number" ? "0" : "@";
    cell.font = { name: FONT, size: 10, color: { argb: SHEET_COLORS.charcoal } };
    cell.alignment = { horizontal: "left", wrapText: true };
    cell.border = BORDER;
    row.commit();
  });
  sheet.commit();
}

/**
 * `.xlsx` through the exceljs streaming writer (ADR-0017), styled from the design
 * tokens: deep-blue header with filters, frozen header and name columns, banded rows,
 * real numbers, money and Vietnam-time dates, coloured statuses, wrapped answers, and a
 * "Tổng quan" sheet. No formulas: every text cell is guarded (`safeCell`).
 */
export class ExcelWorkbookWriter implements WorkbookWriter {
  async write(book: Workbook): Promise<Buffer> {
    const stream = new PassThrough();
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<void>((resolve, reject) => {
      stream.on("end", resolve);
      stream.on("error", reject);
    });

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream, useStyles: true });
    workbook.creator = "LAVIECO";
    writeTable(workbook, book.table);
    if (book.summary) writeSummary(workbook, book.summary);
    await workbook.commit();
    await done;
    return Buffer.concat(chunks);
  }
}
