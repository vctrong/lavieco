import type { PriceItemRecord } from "../domain/price-item";
import { vnDay, type SalesOrderRecord } from "../domain/sales-order";

/**
 * The read-only Google Sheet (ADR-0030): three tabs rewritten whole from MongoDB. Row 1
 * tells when; row 2 is the header (the old sheet's columns, plus the old code and the
 * source). Values go in RAW: a phone keeps its leading zero and a name starting with `=`
 * stays text, never a formula.
 */
export type SheetCell = string | number;

/** How a cell is highlighted; colours come from the sheet tokens (infrastructure). */
export type SheetTone = "done" | "muted" | "attention" | "alert";

/**
 * Highlight of a data cell: equal to a label, or a custom formula written for the first
 * data row (row 3) in the spreadsheet's own syntax (`;` separators, Vietnamese locale).
 */
export type SheetRule =
  | { column: number; equals: string; tone: SheetTone }
  | { column: number; formula: string; tone: SheetTone };

/** Presentation of a tab, applied after every rewrite so the Sheet always looks the same. */
export type SheetLayout = {
  /** Width of each column in pixels; also the number of columns. */
  widths: number[];
  /** Columns holding VND amounts: `#,##0`, right aligned. */
  money: number[];
  /** Long text columns that wrap (address, note). */
  wrap: number[];
  /** Columns kept on screen when scrolling sideways. */
  frozenColumns: number;
  rules: SheetRule[];
};

export type SheetTab = {
  name: "DonHang" | "ChiTiet" | "DonGia";
  rows: SheetCell[][];
  layout: SheetLayout;
};

/** First data row (rows 1 and 2 are the title and the header). */
export const SHEET_DATA_ROW = 3;

const STATUS_RULES = (column: number): SheetRule[] => [
  { column, equals: "Hoàn thành", tone: "done" },
  { column, equals: "Đã hủy", tone: "muted" },
  { column, equals: "Mới", tone: "attention" },
];

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
  // Row 1, merged across the tab: what it is, when it was written, that it is read only.
  const title = (tab: string): SheetCell[] => [
    `LAVIECO · Sổ đơn hàng — ${tab}   ·   Cập nhật lúc ${stampOf(now)}   ·   Chỉ xem: muốn sửa, vào admin → Đơn hàng`,
  ];
  const sorted = [...orders].sort(byCode);
  return [
    {
      name: "DonHang",
      rows: [
        title("Đơn hàng"),
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
      layout: {
        widths: [
          92, 76, 170, 110, 92, 240, 86, 96, 76, 82, 100, 110, 124, 104, 104, 140, 220, 66, 76,
        ],
        money: [7, 8, 9, 10],
        wrap: [5, 16],
        frozenColumns: 1,
        rules: [
          ...STATUS_RULES(13),
          { column: 12, equals: "Chưa thanh toán", tone: "alert" },
          { column: 12, equals: "Đã cọc", tone: "attention" },
          { column: 12, equals: "Đã thanh toán", tone: "done" },
          // Late: due day passed and the order is still open (days are dd/mm/yyyy text).
          {
            column: 14,
            formula:
              '=AND($O3<>"";$N3<>"Hoàn thành";$N3<>"Đã hủy";DATE(RIGHT($O3;4);MID($O3;4;2);LEFT($O3;2))<TODAY())',
            tone: "alert",
          },
          // Open order with no due day yet.
          {
            column: 14,
            formula: '=AND($A3<>"";$O3="";$N3<>"Hoàn thành";$N3<>"Đã hủy")',
            tone: "attention",
          },
        ],
      },
    },
    {
      name: "ChiTiet",
      rows: [
        title("Chi tiết món"),
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
      layout: {
        widths: [100, 240, 84, 110, 120],
        money: [3, 4],
        wrap: [1],
        frozenColumns: 1,
        rules: [],
      },
    },
    {
      name: "DonGia",
      rows: [
        title("Danh mục đơn giá"),
        ["Sản phẩm", "Đơn giá (VNĐ)", "Đang bán", "Ghi chú"],
        ...priceItems.map((item) => [
          item.name,
          item.price,
          item.active ? "Có" : "Không",
          item.note,
        ]),
      ],
      layout: {
        widths: [240, 110, 90, 260],
        money: [1],
        wrap: [3],
        frozenColumns: 1,
        rules: [
          { column: 2, equals: "Không", tone: "muted" },
          { column: 2, equals: "Có", tone: "done" },
        ],
      },
    },
  ];
}
