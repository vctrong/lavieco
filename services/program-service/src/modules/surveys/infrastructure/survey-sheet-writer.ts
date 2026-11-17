import { ExcelWorkbookWriter, type SheetColumn } from "../../registrations";
import type { Sheet, SheetFile } from "../application/survey-service";

/** The row number, the submission time and the respondent are short; answers wrap. */
const SHORT_COLUMNS = new Set(["Thời gian", "Họ tên", "Email"]);

const columnOf = (header: string): SheetColumn => ({
  header,
  kind: header === "STT" ? "index" : SHORT_COLUMNS.has(header) ? "text" : "longText",
});

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const BOM = String.fromCharCode(0xfeff);
const quote = (cell: string) => `"${cell.replace(/"/g, '""')}"`;

/** CSV with a BOM, so Excel reads the Vietnamese correctly; every cell is quoted. */
export function toCsv(sheet: Pick<Sheet, "header" | "rows">): Buffer {
  const lines = [sheet.header, ...sheet.rows].map((row) => row.map(quote).join(","));
  return Buffer.from(`${BOM}${lines.join("\r\n")}\r\n`, "utf8");
}

/** The same `.xlsx` writer as the registrations (ADR-0017), or a CSV. */
export async function writeSurveySheet(sheet: Sheet, format: "xlsx" | "csv"): Promise<SheetFile> {
  if (format === "csv") {
    return {
      fileName: `${sheet.fileName}.csv`,
      contentType: "text/csv; charset=utf-8",
      content: toCsv(sheet),
    };
  }
  const fileName = `${sheet.fileName}.xlsx`;
  const content = await new ExcelWorkbookWriter().write({
    fileName,
    table: { name: "Câu trả lời", columns: sheet.header.map(columnOf), rows: sheet.rows },
  });
  return { fileName, contentType: XLSX, content };
}
