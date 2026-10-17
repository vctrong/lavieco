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
