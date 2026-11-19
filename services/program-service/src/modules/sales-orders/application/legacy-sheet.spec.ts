import { describe, expect, it } from "vitest";

import {
  matchStaff,
  parseDay,
  parseMoney,
  planLegacyImport,
  type LegacyTabs,
} from "./legacy-sheet";

// Made-up rows in the sheet's layout: no real customer data in fixtures.
const HEADER = [
  "Mã đơn",
  "Loại đơn",
  "Tên khách hàng",
  "Số điện thoại",
  "Ngày đặt",
  "Địa chỉ giao hàng",
  "Kênh bán",
  "Tiền hàng (VNĐ)",
  "Phí ship (VNĐ)",
  "Giảm giá (VNĐ)",
  "Tổng tiền (VNĐ)",
  "Hình thức thanh toán",
  "Trạng thái thanh toán",
  "Trạng thái đơn",
  "Ngày giao dự kiến",
  "Người phụ trách",
  "Ghi chú",
];

const tabs = (): LegacyTabs => ({
  donHang: [
    HEADER,
    [
      "G-03",
      "G",
      "Khách Sỉ",
      "0900000001",
      "07/10/2026",
      "Ấp A",
      "Trực tiếp",
      "370.000",
      "0",
      "160.000",
      "210.000",
      "Chuyển khoản",
      "Đã thanh toán",
      "Hoàn thành",
      "15/10/2026",
      "An",
      "Giảm giá",
    ],
    [
      "P-05",
      "P",
      "Khách Không Ngày",
      "",
      "",
      "",
      "Trực tiếp",
      "60.000",
      "0",
      "0",
      "60.000",
      "Tiền mặt",
      "Đã thanh toán",
      "Hoàn thành",
      "",
      "Bình",
    ],
    [
      "W-01",
      "W",
      "Khách Đặt",
      "0900000002",
      "02/10/2026",
      "Trường",
      "Trực tiếp",
      "35.000",
      "0",
      "0",
      "35.000",
      "",
      "Chưa thanh toán",
      "Đã hủy",
      "",
      "An",
    ],
    [
      "G-07",
      "G",
      "Khách Threads",
      "",
      "16/11/2026",
      "",
      "Threads",
      "45.000",
      "0",
      "0",
      "45.000",
      "Chuyển khoản",
      "",
      "Đang giao",
      "",
      "An",
    ],
  ],
  chiTiet: [
    ["Mã đơn", "Sản phẩm", "Số lượng", "Đơn giá (VNĐ)", "Thành tiền (VNĐ)"],
    ["W-01", "Worry Stone", "1", "35.000", "35.000"],
    ["G-03", "Khay vỏ sò", "2", "45.000", "90.000"],
    ["G-03", "Khay 1kg bự", "2", "140.000", "280.000"],
    ["P-05", "Phone charm", "2", "30.000", "60.000"],
    ["G-07", "Khay ngôi sao", "1", "45.000", "45.000"],
  ],
  donGia: [
    ["Sản phẩm", "Đơn giá (VNĐ)", "Ghi chú"],
    ["Khay vỏ sò", "45.000"],
    ["Móc khóa", "15.000", "Móc khóa ốc cắt"],
  ],
});

describe("planLegacyImport", () => {
  it("numbers orders by order day, undated ones last", () => {
    const plan = planLegacyImport(tabs());
    expect(plan.problems).toEqual([]);
    expect(plan.orders.map((o) => [o.code, o.legacyCode])).toEqual([
      ["LV-0001", "W-01"],
      ["LV-0002", "G-03"],
      ["LV-0003", "G-07"],
      ["LV-0004", "P-05"],
    ]);
  });

  it("maps labels, types and money", () => {
    const plan = planLegacyImport(tabs());
    const g03 = plan.orders.find((o) => o.legacyCode === "G-03")!;
    expect(g03).toMatchObject({
      orderType: "wholesale",
      channel: "in_person",
      paymentMethod: "bank_transfer",
      paymentStatus: "paid",
      status: "completed",
      orderDay: "2026-10-07",
      dueDay: "2026-10-15",
      subtotal: 370_000,
      discount: 160_000,
      total: 210_000,
    });
    expect(plan.orders.find((o) => o.legacyCode === "W-01")).toMatchObject({
      orderType: "made_to_order",
      paymentMethod: null,
      status: "cancelled",
    });
    expect(plan.orders.find((o) => o.legacyCode === "G-07")).toMatchObject({
      channel: "threads",
      paymentStatus: "unpaid",
      status: "shipping",
    });
    expect(plan.sumTotal).toBe(350_000);
    expect(plan.priceItems).toEqual([
      { name: "Khay vỏ sò", price: 45_000, note: "" },
      { name: "Móc khóa", price: 15_000, note: "Móc khóa ốc cắt" },
    ]);
  });

  it("reports money that does not add up instead of importing it", () => {
    const broken = tabs();
    broken.donHang[1]![10] = "200.000";
    expect(planLegacyImport(broken).problems).toContain(
      "DonHang G-03: tổng tiền 200000 ≠ tính lại 210000",
    );
  });

  it("reports lines of an order that is not in DonHang", () => {
    const broken = tabs();
    broken.chiTiet.push(["X-99", "Vịt", "1", "20.000", "20.000"]);
    expect(planLegacyImport(broken).problems).toContain(
      "ChiTiet có món của đơn X-99 không có trong DonHang",
    );
  });
});

describe("parsers", () => {
  it("reads Vietnamese money and days", () => {
    expect(parseMoney("1.000.000")).toBe(1_000_000);
    expect(parseMoney("")).toBe(0);
    expect(parseMoney("abc")).toBeNull();
    expect(parseDay("2/10/2026")).toBe("2026-10-02");
    expect(parseDay("")).toBeNull();
    expect(parseDay("2026-10-02")).toBeUndefined();
  });
});

describe("matchStaff", () => {
  const staff = [
    { id: "1", name: "Võ Chí Trọng" },
    { id: "2", name: "Nguyễn Xuân Anh" },
    { id: "3", name: "Trần Anh" },
  ];
  it("matches the given name without accents", () => {
    expect(matchStaff("Trọng", staff)?.id).toBe("1");
    expect(matchStaff("Xuân Anh", staff)?.id).toBe("2");
  });
  it("refuses an ambiguous or unknown name", () => {
    expect(matchStaff("Anh", staff)).toBeNull();
    expect(matchStaff("Vy", staff)).toBeNull();
  });
});
