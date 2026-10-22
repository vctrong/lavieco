import { describe, expect, it } from "vitest";

import { eventShortcuts } from "./event-shortcuts";

const published = {
  id: "6ad42b8cb26cadf18afd37c7",
  kind: "standard",
  status: "published",
} as const;
const keys = (...args: Parameters<typeof eventShortcuts>) =>
  eventShortcuts(...args).map((shortcut) => shortcut.key);

describe("eventShortcuts", () => {
  it("gives the coordinator registrations, orders and the door", () => {
    expect(eventShortcuts(published, { roles: ["coordinator"] })).toEqual([
      { key: "registrations", href: "/events/6ad42b8cb26cadf18afd37c7/registrations" },
      { key: "orders", href: "/orders?eventId=6ad42b8cb26cadf18afd37c7" },
      { key: "checkin", href: "/checkin/6ad42b8cb26cadf18afd37c7" },
    ]);
  });

  it("hides what the role may not do", () => {
    expect(keys(published, { roles: ["auditor"] })).toEqual(["registrations", "orders"]);
    expect(keys(published, { roles: ["content_editor"] })).toEqual([]);
  });

  it("shows nothing for drafts and past events, and no door once ended", () => {
    const staff = { roles: ["super_admin"] as const };
    expect(keys({ ...published, status: "draft" }, staff)).toEqual([]);
    expect(keys({ ...published, kind: "past" }, staff)).toEqual([]);
    expect(keys({ ...published, status: "ended" }, staff)).toEqual(["registrations", "orders"]);
    expect(keys({ ...published, status: "cancelled" }, staff)).toEqual(["registrations", "orders"]);
  });
});
