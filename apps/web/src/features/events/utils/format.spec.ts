import { describe, expect, it } from "vitest";

import { eventCalendar } from "./calendar";
import {
  durationOf,
  formatSchedule,
  groupByMonth,
  monthLabel,
  paragraphsOf,
  priceText,
  upcomingMonths,
} from "./format";

describe("events format helpers", () => {
  it("formats a same-day schedule in Vietnam time", () => {
    expect(formatSchedule("2026-11-15T02:00:00.000Z", "2026-11-15T05:00:00.000Z")).toMatch(
      /15\/11\/2026 · 09:00–12:00$/,
    );
  });

  it("splits paragraphs on blank lines only", () => {
    expect(paragraphsOf("Một\ndòng\n\n  Hai  \n\n\n")).toEqual(["Một\ndòng", "Hai"]);
  });

  it("lists months from the current Vietnam month, across years", () => {
    expect(upcomingMonths(3, new Date("2026-12-31T18:00:00.000Z"))).toEqual([
      "2027-01",
      "2027-02",
      "2027-03",
    ]);
    expect(monthLabel("2027-01")).toBe("Tháng 1/2027");
  });

  it("groups by month in Vietnam time, not UTC", () => {
    // 31/10 18:00 UTC is already 1/11 in Vietnam.
    const groups = groupByMonth([
      { startAt: "2026-10-30T02:00:00.000Z" },
      { startAt: "2026-10-31T18:00:00.000Z" },
      { startAt: "2026-11-20T02:00:00.000Z" },
    ]);
    expect(groups.map((group) => [group.month, group.events.length])).toEqual([
      ["2026-10", 1],
      ["2026-11", 2],
    ]);
  });

  it("says 'Từ' only when ticket prices differ, and 'Miễn phí' only when all are free", () => {
    const labels = { free: "Miễn phí", from: (price: string) => `Từ ${price}` };
    expect(priceText({ min: 0, max: 0 }, labels)).toBe("Miễn phí");
    expect(priceText({ min: 0, max: 120_000 }, labels)).toMatch(/^Từ 0/);
    expect(priceText({ min: 200_000, max: 200_000 }, labels)).toMatch(/^200\.000/);
    expect(priceText(null, labels)).toBeNull();
  });

  it("measures the duration from the event times", () => {
    expect(durationOf("2026-11-15T02:00:00.000Z", "2026-11-15T04:30:00.000Z")).toEqual({
      unit: "hours",
      value: "2,5",
    });
    expect(durationOf("2026-11-15T02:00:00.000Z", "2026-11-15T02:45:00.000Z")).toEqual({
      unit: "minutes",
      value: 45,
    });
    expect(durationOf("2026-11-15T02:00:00.000Z", "2026-11-17T10:00:00.000Z")).toEqual({
      unit: "days",
      value: 3,
    });
  });
});

describe("eventCalendar", () => {
  const event = {
    slug: "workshop-thu",
    title: "Workshop; thử, nghiệm",
    summary: "Một dòng tóm tắt",
    startAt: "2026-11-15T02:00:00.000Z",
    endAt: "2026-11-15T05:00:00.000Z",
    format: "offline" as const,
    venue: { name: "Xưởng LAVIECO", address: "Ninh Kiều, Cần Thơ", mapUrl: null },
    status: "published" as const,
  };

  it("writes a valid VEVENT in UTC with escaped text and CRLF lines", () => {
    const ics = eventCalendar(event, {
      pageUrl: "https://lavieco.io.vn/chuong-trinh/workshop-thu",
      organizer: "LAVIECO",
      now: new Date("2026-10-22T00:00:00.000Z"),
    });
    expect(ics).toContain("DTSTART:20261115T020000Z\r\n");
    expect(ics).toContain("SUMMARY:Workshop\\; thử\\, nghiệm\r\n");
    expect(ics).toContain("LOCATION:Xưởng LAVIECO\\, Ninh Kiều\\, Cần Thơ");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    for (const line of ics.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it("has no location for an online event and marks a cancelled one", () => {
    const ics = eventCalendar(
      { ...event, format: "online", venue: null, status: "cancelled" },
      { pageUrl: "https://lavieco.io.vn/x", organizer: "LAVIECO" },
    );
    expect(ics).not.toContain("LOCATION:");
    expect(ics).toContain("STATUS:CANCELLED");
  });
});
