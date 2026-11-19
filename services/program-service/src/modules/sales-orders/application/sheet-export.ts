import type { PriceItemRecord } from "../domain/price-item";
import { vnDay, type SalesOrderRecord } from "../domain/sales-order";

/**
 * The read-only Google Sheet (ADR-0030, BR-29): three tabs rewritten whole from MongoDB.
 * Row 1 is a large title band with the update time; row 2 is the header (the old sheet's
 * columns, plus the old code and the source). Values go in RAW: a phone keeps its leading
 * zero and a name starting with `=` stays text, never a formula.
 */
export type SheetCell = string | number;

/** How a cell is highlighted; colours come from the sheet tokens (infrastructure). */
export type SheetTone = "done" | "muted" | "attention" | "alert" | "info";

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
  /** Short labels, days and codes: centred. */
  center: number[];
  /** Long text columns that wrap (address, note). */
  wrap: number[];
  /** Columns kept on screen when scrolling sideways. */
  frozenColumns: number;
  /** Category columns shown as dropdown chips with the exact labels the app writes. */
  choices: { column: number; values: string[] }[];
  rules: SheetRule[];
};

export type SheetTab = {
  name: "DonHang" | "ChiTiet" | "DonGia";
  /** Row 1: `main` in large type, `sub` smaller on the same line. */
  title: { main: string; sub: string };
  rows: SheetCell[][];
  layout: SheetLayout;
};

/** First data row (rows 1 and 2 are the title and the header). */
export const SHEET_DATA_ROW = 3;

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

const values = (labels: Record<string, string>) => Object.values(labels);

/**
 * @param staffNames full names of the staff accounts (assignee dropdown); names still on
 * orders are added so a former member never shows as invalid.
 */
export function buildSheetTabs(
  orders: readonly SalesOrderRecord[],
  priceItems: readonly PriceItemRecord[],
  now: Date,
  staffNames: readonly string[] = [],
): SheetTab[] {
  const title = (tab: string) => ({
    main: `Sổ đơn hàng LAVIECO · ${tab} · Cập nhật lúc ${stampOf(now)}`,
    sub: "      Chỉ xem: muốn thêm hay sửa đơn, vào admin → Đơn hàng",
  });
  const titleRow = (tab: string): SheetCell[] => {
    const { main, sub } = title(tab);
    return [main + sub];
  };
  const sorted = [...orders].sort(byCode);
  const assignees = [
    ...new Set([
      ...staffNames,
      ...sorted.map((order) => order.assignee?.name ?? "").filter((name) => name !== ""),
    ]),
  ].sort((a, b) => a.localeCompare(b, "vi"));
  return [
    {
      name: "DonHang",
      title: title("Đơn hàng"),
      rows: [
        titleRow("Đơn hàng"),
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
          104, 96, 180, 118, 100, 250, 108, 108, 92, 100, 116, 140, 150, 130, 116, 180, 240, 72, 96,
        ],
        money: [7, 8, 9, 10],
        center: [0, 1, 3, 4, 6, 11, 12, 13, 14, 17, 18],
        wrap: [5, 16],
        frozenColumns: 0,
        choices: [
          { column: 1, values: values(TYPE) },
          { column: 6, values: values(CHANNEL) },
          { column: 11, values: values(METHOD) },
          { column: 12, values: values(PAYMENT) },
          { column: 13, values: values(STATUS) },
          { column: 15, values: assignees },
          { column: 18, values: values(SOURCE) },
        ],
        rules: [
          { column: 13, equals: "Hoàn thành", tone: "done" },
          { column: 13, equals: "Đã hủy", tone: "muted" },
          { column: 13, equals: "Mới", tone: "attention" },
          { column: 13, equals: "Đang làm", tone: "info" },
          { column: 13, equals: "Đang giao", tone: "info" },
          { column: 12, equals: "Chưa thanh toán", tone: "alert" },
          { column: 12, equals: "Đã cọc", tone: "attention" },
          { column: 12, equals: "Đã thanh toán", tone: "done" },
          { column: 1, equals: "Đặt làm", tone: "info" },
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
      title: title("Chi tiết món"),
      rows: [
        titleRow("Chi tiết món"),
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
        widths: [110, 280, 96, 130, 140],
        money: [3, 4],
        center: [0, 2],
        wrap: [1],
        frozenColumns: 0,
        choices: [],
        rules: [],
      },
    },
    {
      name: "DonGia",
      title: title("Danh mục đơn giá"),
      rows: [
        titleRow("Danh mục đơn giá"),
        ["Sản phẩm", "Đơn giá (VNĐ)", "Đang bán", "Ghi chú"],
        ...priceItems.map((item) => [
          item.name,
          item.price,
          item.active ? "Có" : "Không",
          item.note,
        ]),
      ],
      layout: {
        widths: [260, 130, 110, 300],
        money: [1],
        center: [2],
        wrap: [0, 3],
        frozenColumns: 0,
        choices: [{ column: 2, values: ["Có", "Không"] }],
        rules: [
          { column: 2, equals: "Không", tone: "muted" },
          { column: 2, equals: "Có", tone: "done" },
        ],
      },
    },
  ];
}
