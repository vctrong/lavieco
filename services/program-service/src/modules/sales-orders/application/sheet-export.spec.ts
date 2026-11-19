import { describe, expect, it } from "vitest";

import type { SalesOrderRecord } from "../domain/sales-order";
import { buildSheetTabs, sheetDay } from "./sheet-export";

const order = (over: Partial<SalesOrderRecord>): SalesOrderRecord => ({
  id: "1",
  code: "LV-0002",
  legacyCode: null,
  source: "manual",
  shopOrderId: null,
  orderType: "in_stock",
  customer: { name: "=Khách", phone: "0900000001", phoneNormalized: null, address: null },
  channel: "zalo",
  items: [{ priceItemId: null, name: "Khay vỏ sò", unitPrice: 45_000, quantity: 2 }],
  subtotal: 90_000,
  shippingFee: 0,
  discount: 0,
  total: 90_000,
  paymentMethod: null,
  paymentStatus: "deposit_paid",
  status: "shipping",
  orderDay: "2026-11-16",
  dueDay: null,
  assignee: { id: "a", name: "Xuân Anh" },
  note: "",
  createdBy: null,
  updatedBy: null,
  deletedAt: null,
  revision: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

describe("buildSheetTabs", () => {
  const tabs = buildSheetTabs(
    [
      order({ code: "LVS-ABC123", source: "web", channel: "website" }),
      order({ code: "LV-0010" }),
      order({ code: "LV-0002" }),
    ],
    [
      {
        id: "p",
        name: "Phone charm",
        price: 30_000,
        active: false,
        note: "",
        sortOrder: 0,
        revision: 1,
        updatedAt: new Date(),
      },
    ],
    new Date("2026-11-20T02:30:00Z"),
  );

  it("writes the three tabs with the update time in row 1", () => {
    expect(tabs.map((tab) => tab.name)).toEqual(["DonHang", "ChiTiet", "DonGia"]);
    for (const tab of tabs) expect(tab.rows[0]![1]).toBe("20/11/2026 09:30");
  });

  it("lists manual orders by number first, then website ones", () => {
    expect(tabs[0]!.rows.slice(2).map((row) => row[0])).toEqual([
      "LV-0002",
      "LV-0010",
      "LVS-ABC123",
    ]);
  });

  it("writes labels and keeps the phone as text", () => {
    const row = tabs[0]!.rows[2]!;
    expect(row).toContain("Đã cọc");
    expect(row).toContain("Đang giao");
    expect(row).toContain("Zalo");
    expect(row[3]).toBe("0900000001");
  });

  it("puts one line per item and the price list", () => {
    expect(tabs[1]!.rows[2]).toEqual(["LV-0002", "Khay vỏ sò", 2, 45_000, 90_000]);
    expect(tabs[2]!.rows[2]).toEqual(["Phone charm", 30_000, "Không", ""]);
  });

  it("writes days the way the old sheet did", () => {
    expect(sheetDay("2026-10-07")).toBe("07/10/2026");
    expect(sheetDay(null)).toBe("");
  });
});
