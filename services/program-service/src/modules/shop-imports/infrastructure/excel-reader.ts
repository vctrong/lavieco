import { Readable } from "node:stream";

import ExcelJS from "exceljs";

import { IMPORT_COLUMNS, IMPORT_LIMITS } from "@lavieco/shared/shop";

import type { SpreadsheetReader } from "../application/import-service";
import type { RawRow } from "../domain/import-rows";

const KNOWN = new Set<string>(IMPORT_COLUMNS);

/** Header text → column key (`Tên sản phẩm` is not accepted: the template's keys are). */
const headerKey = (text: string) => text.trim().toLowerCase().replace(/\s+/g, "_");

/**
 * `.xlsx` (first sheet) or `.csv` (`,` or `;`, UTF-8 with or without BOM). Only cell
 * values are read: formulas are never evaluated, their cached result is taken as text.
 */
export class ExcelSpreadsheetReader implements SpreadsheetReader {
  async read(bytes: Buffer, fileName: string): Promise<RawRow[]> {
    const workbook = new ExcelJS.Workbook();
    let sheet: ExcelJS.Worksheet | undefined;
    if (/\.csv$/i.test(fileName)) {
      const text = bytes.toString("utf8").replace(/^\uFEFF/, "");
      const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
      const delimiter =
        (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
      sheet = await workbook.csv.read(Readable.from([text]), { parserOptions: { delimiter } });
    } else {
      await workbook.xlsx.load(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
      );
      sheet = workbook.worksheets[0];
    }
    if (!sheet) return [];

    const columns = new Map<number, string>();
    sheet.getRow(1).eachCell((cell, index) => {
      const key = headerKey(cell.text ?? "");
      if (KNOWN.has(key)) columns.set(index, key);
    });
    const found = new Set(columns.values());
    if (!found.has("sku") || !found.has("slug")) {
      throw new Error("missing headers");
    }

    const rows: RawRow[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1 || rows.length > IMPORT_LIMITS.rows) return;
      const raw: Record<string, string> = {};
      for (const [index, key] of columns) {
        raw[key] = String(row.getCell(index).text ?? "")
          .trim()
          .slice(0, IMPORT_LIMITS.cellMax);
      }
      if (Object.values(raw).some(Boolean)) rows.push({ rowNumber, raw });
    });
    return rows;
  }
}
