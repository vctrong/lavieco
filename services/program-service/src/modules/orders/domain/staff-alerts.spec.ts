import { describe, expect, it } from "vitest";

import { pushNotificationRequestSchema } from "@lavieco/shared/identity";

import { orderAlert, seatAlert, stableAlertId } from "./staff-alerts";

const order = {
  id: "665f1c2a9b1e8a0012345678",
  orderCode: 260001,
  amount: 300_000,
  items: [{ quantity: 2, seatsPerUnit: 1 }],
} as unknown as Parameters<typeof orderAlert>[0];

describe("staff alerts", () => {
  it("gives the same id to the same job, so a retry is dropped", () => {
    expect(stableAlertId("order:1:confirmed")).toBe(stableAlertId("order:1:confirmed"));
    expect(stableAlertId("order:1:confirmed")).not.toBe(stableAlertId("order:2:confirmed"));
  });

  it("builds valid alerts for every reason and seat state", () => {
    for (const alert of [
      orderAlert(order, "Workshop vỏ sò", "confirmed"),
      orderAlert({ ...order, amount: 0 }, "Workshop vỏ sò", "confirmed"),
      orderAlert(order, "Workshop vỏ sò", "refund_required"),
      orderAlert(order, "Workshop vỏ sò", "amount_mismatch"),
      seatAlert({ id: "e1", title: "Workshop vỏ sò" }, "few_left", 3),
      seatAlert({ id: "e1", title: "Workshop vỏ sò" }, "sold_out", 0),
    ]) {
      expect(pushNotificationRequestSchema.safeParse(alert).success).toBe(true);
    }
  });

  it("routes paid and free orders to their own topics", () => {
    expect(orderAlert(order, "A", "confirmed").topic).toBe("order_paid");
    expect(orderAlert({ ...order, amount: 0 }, "A", "confirmed").topic).toBe("registration_free");
    expect(orderAlert(order, "A", "refund_required").topic).toBe("order_attention");
  });

  it("never carries the buyer's personal data (only ids, counts, amount)", () => {
    const withBuyer = {
      ...order,
      buyer: { fullName: "Nguyễn Văn A", email: "a@example.com", phone: "+84901234567" },
    };
    const text = JSON.stringify(orderAlert(withBuyer, "A", "confirmed"));
    expect(text).not.toContain("Nguyễn Văn A");
    expect(text).not.toContain("a@example.com");
    expect(text).not.toContain("0901234567");
  });

  it("keeps long event titles within the notification limits", () => {
    const alert = orderAlert(order, "x".repeat(300), "confirmed");
    expect(pushNotificationRequestSchema.safeParse(alert).success).toBe(true);
  });
});
