import type { PriceItemRecord } from "../domain/price-item";
import { vnDay, type SalesOrderRecord } from "../domain/sales-order";

/**
 * The read-only Google Sheet (ADR-0030): three tabs rewritten whole from MongoDB. Row 1
 * tells when; row 2 is the header (the old sheet's columns, plus the old code and the
 * source). Values go in RAW: a phone keeps its leading zero and a name starting with `=`
 * stays text, never a formula.
 */
export type SheetCell = string | number;
export type SheetTab = { name: "DonHang" | "ChiTiet" | "DonGia"; rows: SheetCell[][] };

const TYPE = { in_stock: "Có sẵn", made_to_order: "Đặt làm", wholesale: "Sỉ" } as const;
const STATUS = {
  new: "Mới",
  in_progress: "Đang làm",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
} as const;
const PAYMENT = {
  unpaid: "Chưa thanh toán",
  deposit_paid: "Đã cọc",
  paid: "Đã thanh toán",
} as const;
const METHOD = { bank_transfer: "Chuyển khoản", cod: "COD", cash: "Tiền mặt" } as const;
const CHANNEL = {
  facebook: "Facebook",
  tiktok: "TikTok",
  website: "Website",
  zalo: "Zalo",
  in_person: "Trực tiếp",
  threads: "Threads",
  other: "Khác",
} as const;
const SOURCE = { manual: "Đơn tay", web: "Website" } as const;

/** `2026-10-07` → `07/10/2026`, as the team wrote days in the old sheet. */
export const sheetDay = (day: string | null) => {
  if (!day) return "";
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
};

const TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
/** `20/11/2026 09:30` in Asia/Ho_Chi_Minh. */
const stampOf = (now: Date) => `${sheetDay(vnDay(now))} ${TIME.format(now)}`;

/** Manual orders by number, then website ones by day: the order the team reads. */
function byCode(a: SalesOrderRecord, b: SalesOrderRecord) {
  if (a.source !== b.source) return a.source === "manual" ? -1 : 1;
  if (a.source === "manual") return a.code.localeCompare(b.code, "en", { numeric: true });
  return (a.orderDay ?? "").localeCompare(b.orderDay ?? "") || a.code.localeCompare(b.code);
}

export function buildSheetTabs(
  orders: readonly SalesOrderRecord[],
  priceItems: readonly PriceItemRecord[],
  now: Date,
): SheetTab[] {
  const stamp: SheetCell[] = ["Cập nhật lúc", stampOf(now), "Chỉ xem: sửa đơn trong admin"];
  const sorted = [...orders].sort(byCode);
  return [
    {
      name: "DonHang",
      rows: [
        stamp,
        [
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
          "Mã cũ",
          "Nguồn",
        ],
        ...sorted.map((order) => [
          order.code,
          TYPE[order.orderType],
          order.customer.name,
          order.customer.phone,
          sheetDay(order.orderDay),
          order.customer.address?.full ?? "",
          CHANNEL[order.channel],
          order.subtotal,
          order.shippingFee,
          order.discount,
          order.total,
          order.paymentMethod ? METHOD[order.paymentMethod] : "",
          PAYMENT[order.paymentStatus],
          STATUS[order.status],
          sheetDay(order.dueDay),
          order.assignee?.name ?? "",
          order.note,
          order.legacyCode ?? "",
          SOURCE[order.source],
        ]),
      ],
    },
    {
      name: "ChiTiet",
      rows: [
        stamp,
        ["Mã đơn", "Sản phẩm", "Số lượng", "Đơn giá (VNĐ)", "Thành tiền (VNĐ)"],
        ...sorted.flatMap((order) =>
          order.items.map((item) => [
            order.code,
            item.name,
            item.quantity,
            item.unitPrice,
            item.unitPrice * item.quantity,
          ]),
        ),
      ],
    },
    {
      name: "DonGia",
      rows: [
        stamp,
        ["Sản phẩm", "Đơn giá (VNĐ)", "Đang bán", "Ghi chú"],
        ...priceItems.map((item) => [
          item.name,
          item.price,
          item.active ? "Có" : "Không",
          item.note,
        ]),
      ],
    },
  ];
}
