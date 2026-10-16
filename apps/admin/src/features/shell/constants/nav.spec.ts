import { describe, expect, it } from "vitest";

import { can } from "@lavieco/shared/permissions";

import { NAV_GROUPS } from "./nav";
import { TEXT } from "./text";

const items = NAV_GROUPS.flatMap((group) => group.items);

describe("admin navigation", () => {
  it("has copy for every entry", () => {
    for (const item of items) expect(TEXT.vi.items).toHaveProperty(item.id);
  });

  it("keeps events apart from the public program descriptions", () => {
    expect(items.find((item) => item.id === "events")?.href).toBe("/events");
    expect(items.find((item) => item.id === "programs")?.href).toBe("/programs");
  });

  it("shows check-in to coordinators but not to content editors (UX only)", () => {
    const checkin = items.find((item) => item.id === "checkin")!;
    expect(can({ roles: ["coordinator"] }, checkin.permission!)).toBe(true);
    expect(can({ roles: ["content_editor"] }, checkin.permission!)).toBe(false);
  });
});
