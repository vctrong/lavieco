import type { PublicEventDetail } from "@lavieco/shared/events";

type CalendarEvent = Pick<
  PublicEventDetail,
  "slug" | "title" | "summary" | "startAt" | "endAt" | "format" | "venue" | "status"
>;

/** `20261115T020000Z` (RFC 5545 UTC form). */
const icsDate = (iso: string) =>
  new Date(iso).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";

/** RFC 5545 §3.3.11: backslash, semicolon, comma and newlines are escaped in text. */
const escapeText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const encoder = new TextEncoder();

/** RFC 5545 §3.1: lines longer than 75 octets continue on a line starting with a space. */
function fold(line: string): string {
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    // The first line holds 75 octets, continuation lines 74 plus the leading space.
    if (bytes + size > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/**
 * One event as an iCalendar file for "Thêm vào lịch". Built from public data only: the
 * online link is never in it (it is only on the ticket, docs/05).
 */
export function eventCalendar(
  event: CalendarEvent,
  options: { pageUrl: string; organizer: string; now?: Date },
): string {
  const location =
    event.format === "online"
      ? ""
      : event.venue
        ? `${event.venue.name}, ${event.venue.address}`
        : "";
  const description = [event.summary, options.pageUrl].filter(Boolean).join("\n\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${options.organizer}//Chuong trinh//VI`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.slug}@lavieco.io.vn`,
    `DTSTAMP:${icsDate((options.now ?? new Date()).toISOString())}`,
    `DTSTART:${icsDate(event.startAt)}`,
    `DTEND:${icsDate(event.endAt)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    ...(location ? [`LOCATION:${escapeText(location)}`] : []),
    `URL:${options.pageUrl}`,
    `STATUS:${event.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
