/**
 * A spreadsheet export as the application describes it: typed cells and what each
 * column holds. How it looks (fills, widths, number formats) is the writer's job, so
 * every export of the service (registrations, surveys) reads the same way.
 */
export type SheetCell = string | number | Date | null;

/**
 * - `index`: row number. `text`: short text, wraps. `longText`: free answers, wraps wider.
 * - `code`: kept exactly as typed (phone, ticket or order code), never turned into a number.
 * - `number`, `money` (VND): real numbers, so totals and sorting work in Excel.
 * - `dateTime`: an instant, shown at Vietnam time. `status`: short label, coloured by `tones`.
 */
export type SheetColumnKind =
  "index" | "text" | "longText" | "code" | "number" | "money" | "dateTime" | "status";

/** `ok` green, `warn` canary, `muted` grey text, `bad` error text. */
export type SheetTone = "ok" | "warn" | "muted" | "bad";

export type SheetColumn = {
  header: string;
  kind: SheetColumnKind;
  /** For `status` columns: cell text → tone. Text not listed stays plain. */
  tones?: Readonly<Record<string, SheetTone>>;
};

export type SheetTable = { name: string; columns: SheetColumn[]; rows: SheetCell[][] };

/** A second, short sheet: a title and label/value lines (counts, export time...). */
export type SheetSummary = { name: string; title: string; lines: [string, SheetCell][] };

export type Workbook = { fileName: string; table: SheetTable; summary?: SheetSummary };

/** Writes the workbook as `.xlsx` (exceljs streaming writer, ADR-0017). */
export interface WorkbookWriter {
  write(book: Workbook): Promise<Buffer>;
}
