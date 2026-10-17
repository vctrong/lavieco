/** Asia/Ho_Chi_Minh is UTC+7 all year (no daylight saving). */
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

/** UTC bounds `[from, to)` of a calendar month (`YYYY-MM`) in Vietnam time. */
export function monthRange(month: string): { from: Date; to: Date } {
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  const from = new Date(Date.UTC(year, monthNumber - 1, 1) - VIETNAM_OFFSET_MS);
  const to = new Date(Date.UTC(year, monthNumber, 1) - VIETNAM_OFFSET_MS);
  return { from, to };
}

/** Opaque cursor of a list sorted by `(startAt, _id)`. */
export type StartCursor = { startAt: Date; id: string };

export function encodeCursor(cursor: StartCursor): string {
  return Buffer.from(JSON.stringify([cursor.startAt.toISOString(), cursor.id])).toString(
    "base64url",
  );
}

export function decodeCursor(value: string | undefined): StartCursor | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (
      Array.isArray(parsed) &&
      typeof parsed[0] === "string" &&
      typeof parsed[1] === "string" &&
      /^[0-9a-f]{24}$/.test(parsed[1]) &&
      !Number.isNaN(Date.parse(parsed[0]))
    ) {
      return { startAt: new Date(parsed[0]), id: parsed[1] };
    }
  } catch {
    // fall through: an invalid cursor restarts from the first page
  }
  return null;
}
