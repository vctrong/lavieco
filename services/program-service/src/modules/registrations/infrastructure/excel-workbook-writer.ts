import { PassThrough } from "node:stream";

import ExcelJS from "exceljs";

import type { Sheet, WorkbookWriter } from "../application/registrations-service";

const MAX_WIDTH = 60;

/**
 * `.xlsx` through the exceljs streaming writer (ADR-0017): bold, frozen header row and
 * widths fitted to the content. Every cell is written as text (no formulas).
 */
export class ExcelWorkbookWriter implements WorkbookWriter {
  async write(sheet: Sheet): Promise<Buffer> {
    const stream = new PassThrough();
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<void>((resolve, reject) => {
      stream.on("end", resolve);
      stream.on("error", reject);
    });

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream, useStyles: true });
    const worksheet = workbook.addWorksheet("Nguoi dang ky", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    worksheet.columns = sheet.header.map((title, index) => ({
      header: title,
      key: String(index),
      width: Math.min(
        MAX_WIDTH,
        Math.max(title.length, ...sheet.rows.map((row) => (row[index] ?? "").length)) + 2,
      ),
    }));
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).commit();
    for (const row of sheet.rows) worksheet.addRow(row).commit();
    worksheet.commit();
    await workbook.commit();
    await done;
    return Buffer.concat(chunks);
  }
}
