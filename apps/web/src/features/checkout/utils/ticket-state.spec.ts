import { describe, expect, it } from "vitest";

import { ticketState } from "./ticket-state";

describe("ticketState", () => {
  it("is valid only for a valid ticket of a paid order", () => {
    expect(ticketState({ status: "valid" }, "paid")).toBe("valid");
  });

  it("shows a checked-in ticket as used", () => {
    expect(ticketState({ status: "used" }, "paid")).toBe("used");
  });

  it("tells refunded from cancelled for void tickets", () => {
    expect(ticketState({ status: "void" }, "refunded")).toBe("refunded");
    expect(ticketState({ status: "void" }, "paid")).toBe("cancelled");
  });

  it("never shows a ticket of an order that is no longer paid as valid", () => {
    expect(ticketState({ status: "valid" }, "refunded")).toBe("refunded");
    expect(ticketState({ status: "valid" }, "cancelled")).toBe("cancelled");
  });
});
