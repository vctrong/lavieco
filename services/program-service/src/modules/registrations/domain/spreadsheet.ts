/**
 * Spreadsheet formula injection: a cell starting with `=`, `+`, `-`, `@` (or a tab /
 * carriage return that some tools strip first) is run as a formula by Excel or Sheets.
 * Booker-typed text (names, answers) is prefixed with an apostrophe so it stays text.
 */
export function safeCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** `LAVIECO_<slug>_<yyyy-mm-dd>.xlsx`, the date in Asia/Ho_Chi_Minh (ADR-0017). */
export function exportFileName(slug: string, now: Date): string {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return `LAVIECO_${slug}_${day}.xlsx`;
}

/** Vietnam has no daylight saving: UTC+7 all year. */
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Excel stores a date without a time zone and exceljs writes the UTC clock. Shifting the
 * instant by +7 h makes the cell show the time people saw in Vietnam (Asia/Ho_Chi_Minh).
 */
export function vietnamWallClock(instant: Date): Date {
  return new Date(instant.getTime() + VIETNAM_OFFSET_MS);
}
