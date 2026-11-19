import type {
  SalesChannel,
  SalesOrderStatus,
  SalesOrderType,
  SalesPaymentMethod,
  SalesPaymentStatus,
} from "@lavieco/shared/sales";
import { toSearchKey } from "@lavieco/shared";

/**
 * The old Google Sheet (tabs `DonHang`, `ChiTiet`, `DonGia`; never `sheet1`) turned into
 * an import plan (ADR-0030). Pure: the CLI reads the tabs, this decides what they mean
 * and checks the money adds up before anything is written.
 */
export type LegacyTabs = { donHang: string[][]; chiTiet: string[][]; donGia: string[][] };

export type LegacyPriceItem = { name: string; price: number; note: string };

export type LegacyLine = { name: string; unitPrice: number; quantity: number };

export type LegacyOrder = {
  /** Row order in the sheet, the tie-break between orders of the same day. */
  row: number;
  legacyCode: string;
  code: string;
  orderType: SalesOrderType;
  customerName: string;
  phone: string;
  addressText: string;
  channel: SalesChannel;
  lines: LegacyLine[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  paymentMethod: SalesPaymentMethod | null;
  paymentStatus: SalesPaymentStatus;
  status: SalesOrderStatus;
  orderDay: string | null;
  dueDay: string | null;
  assigneeName: string;
  note: string;
};

export type LegacyPlan = {
  priceItems: LegacyPriceItem[];
  orders: LegacyOrder[];
  /** Anything that does not add up or could not be read; the import stops on any. */
  problems: string[];
  /** Defaults applied to empty cells, shown before applying. */
  notes: string[];
  sumTotal: number;
};

/** Types decided by the team (17/11 plan): W-01 made to order, G-03 wholesale. */
export const LEGACY_TYPE_OVERRIDES: Readonly<Record<string, SalesOrderType>> = {
  "W-01": "made_to_order",
  "G-03": "wholesale",
};

const CHANNELS: Readonly<Record<string, SalesChannel>> = {
  "truc tiep": "in_person",
  facebook: "facebook",
  tiktok: "tiktok",
  website: "website",
  zalo: "zalo",
  threads: "threads",
};

const PAYMENT_METHODS: Readonly<Record<string, SalesPaymentMethod>> = {
  "chuyen khoan": "bank_transfer",
  cod: "cod",
  "tien mat": "cash",
};

const PAYMENT_STATUSES: Readonly<Record<string, SalesPaymentStatus>> = {
  "chua thanh toan": "unpaid",
  "da coc": "deposit_paid",
  "da thanh toan": "paid",
};

const STATUSES: Readonly<Record<string, SalesOrderStatus>> = {
  moi: "new",
  "dang lam": "in_progress",
  "dang giao": "shipping",
  "hoan thanh": "completed",
  "da huy": "cancelled",
};

/** `45.000` → 45000 (Vietnamese thousands separator). */
export function parseMoney(text: string | undefined): number | null {
  const cleaned = (text ?? "").replace(/[.\s,đ₫]/g, "");
  if (cleaned === "") return 0;
  return /^\d+$/.test(cleaned) ? Number(cleaned) : null;
}

/** `07/10/2026` → `2026-10-07`; empty → null; anything else → undefined (a problem). */
export function parseDay(text: string | undefined): string | null | undefined {
  const value = (text ?? "").trim();
  if (value === "") return null;
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (!match) return undefined;
  const [, d, m, y] = match;
  return `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
}

const cell = (row: string[], index: number) => (row[index] ?? "").trim();

function lookup<T>(
  table: Readonly<Record<string, T>>,
  text: string,
  fallback: T,
): { value: T; known: boolean } {
  const key = toSearchKey(text);
  if (key === "") return { value: fallback, known: true };
  const value = table[key];
  return value === undefined ? { value: fallback, known: false } : { value, known: true };
}

/** Column index by header text, so a moved column does not shift the meaning. */
function columns(header: string[] | undefined, names: readonly string[]) {
  const keys = (header ?? []).map((name) => toSearchKey(name));
  return names.map((name) => keys.indexOf(toSearchKey(name)));
}

export function planLegacyImport(tabs: LegacyTabs): LegacyPlan {
  const problems: string[] = [];
  const notes: string[] = [];

  // ---- DonGia
  const [pName, pPrice, pNote] = columns(tabs.donGia[0], ["Sản phẩm", "Đơn giá (VNĐ)", "Ghi chú"]);
  const priceItems: LegacyPriceItem[] = [];
  for (const row of tabs.donGia.slice(1)) {
    const name = cell(row, pName!);
    if (!name) continue;
    const price = parseMoney(cell(row, pPrice!));
    if (price === null) problems.push(`DonGia "${name}": giá không đọc được`);
    priceItems.push({ name, price: price ?? 0, note: pNote! >= 0 ? cell(row, pNote!) : "" });
  }

  // ---- ChiTiet
  const [lCode, lName, lQty, lPrice, lTotal] = columns(tabs.chiTiet[0], [
    "Mã đơn",
    "Sản phẩm",
    "Số lượng",
    "Đơn giá (VNĐ)",
    "Thành tiền (VNĐ)",
  ]);
  const linesByCode = new Map<string, LegacyLine[]>();
  for (const [index, row] of tabs.chiTiet.slice(1).entries()) {
    const code = cell(row, lCode!);
    if (!code) continue;
    const quantity = Number(cell(row, lQty!));
    const unitPrice = parseMoney(cell(row, lPrice!));
    const lineTotal = parseMoney(cell(row, lTotal!));
    if (!Number.isInteger(quantity) || quantity < 1 || unitPrice === null) {
      problems.push(`ChiTiet dòng ${index + 2}: số lượng hoặc đơn giá không đọc được`);
      continue;
    }
    if (lineTotal !== null && lineTotal !== unitPrice * quantity)
      problems.push(`ChiTiet dòng ${index + 2} (${code}): thành tiền ≠ đơn giá × số lượng`);
    const lines = linesByCode.get(code) ?? [];
    lines.push({ name: cell(row, lName!), unitPrice, quantity });
    linesByCode.set(code, lines);
  }

  // ---- DonHang
  const header = [
    "Mã đơn",
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
  ] as const;
  const c = columns(tabs.donHang[0], header);
  const missing = header.filter((_, i) => c[i]! < 0);
  if (missing.length) problems.push(`DonHang thiếu cột: ${missing.join(", ")}`);

  const orders: Omit<LegacyOrder, "code">[] = [];
  for (const [index, row] of tabs.donHang.slice(1).entries()) {
    const at = (i: number) => (c[i]! >= 0 ? cell(row, c[i]!) : "");
    const legacyCode = at(0);
    if (!legacyCode) continue;
    const label = `DonHang ${legacyCode}`;
    const lines = linesByCode.get(legacyCode) ?? [];
    if (lines.length === 0) problems.push(`${label}: không có món nào trong ChiTiet`);
    linesByCode.delete(legacyCode);

    const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    const sheetSubtotal = parseMoney(at(6));
    const shippingFee = parseMoney(at(7)) ?? 0;
    const discount = parseMoney(at(8)) ?? 0;
    const sheetTotal = parseMoney(at(9));
    const total = subtotal + shippingFee - discount;
    if (sheetSubtotal !== subtotal)
      problems.push(`${label}: tiền hàng ${sheetSubtotal} ≠ tổng các món ${subtotal}`);
    if (sheetTotal !== total)
      problems.push(`${label}: tổng tiền ${sheetTotal} ≠ tính lại ${total}`);

    const orderDay = parseDay(at(3));
    const dueDay = parseDay(at(13));
    if (orderDay === undefined) problems.push(`${label}: ngày đặt không đọc được`);
    if (dueDay === undefined) problems.push(`${label}: ngày giao không đọc được`);

    const channel = lookup(CHANNELS, at(5), "other" as SalesChannel);
    if (!channel.known) notes.push(`${label}: kênh "${at(5)}" → Khác`);
    const method = lookup(PAYMENT_METHODS, at(10), null as SalesPaymentMethod | null);
    if (!method.known) problems.push(`${label}: hình thức thanh toán "${at(10)}" lạ`);
    if (!at(10)) notes.push(`${label}: chưa có hình thức thanh toán → để trống`);
    const payment = lookup(PAYMENT_STATUSES, at(11), "unpaid" as SalesPaymentStatus);
    if (!payment.known) problems.push(`${label}: trạng thái thanh toán "${at(11)}" lạ`);
    if (!at(11)) notes.push(`${label}: chưa có trạng thái thanh toán → Chưa thanh toán`);
    const status = lookup(STATUSES, at(12), "new" as SalesOrderStatus);
    if (!status.known) problems.push(`${label}: trạng thái đơn "${at(12)}" lạ`);

    orders.push({
      row: index,
      legacyCode,
      orderType: LEGACY_TYPE_OVERRIDES[legacyCode] ?? "in_stock",
      customerName: at(1),
      phone: at(2),
      addressText: at(4),
      channel: channel.value,
      lines,
      subtotal,
      shippingFee,
      discount,
      total,
      paymentMethod: method.value,
      paymentStatus: payment.value,
      status: status.value,
      orderDay: orderDay ?? null,
      dueDay: dueDay ?? null,
      assigneeName: at(14),
      note: at(15),
    });
  }
  for (const code of linesByCode.keys())
    problems.push(`ChiTiet có món của đơn ${code} không có trong DonHang`);

  // Oldest first; orders without an order day go last, each group in sheet order.
  orders.sort((a, b) => {
    if (a.orderDay !== b.orderDay) {
      if (a.orderDay === null) return 1;
      if (b.orderDay === null) return -1;
      return a.orderDay < b.orderDay ? -1 : 1;
    }
    return a.row - b.row;
  });
  const coded = orders.map((order, index) => ({
    ...order,
    code: `LV-${String(index + 1).padStart(4, "0")}`,
  }));
  return {
    priceItems,
    orders: coded,
    problems,
    notes,
    sumTotal: coded.reduce((sum, order) => sum + order.total, 0),
  };
}

/** Sheet first name → staff account, accent-insensitive on the last words of the name. */
export function matchStaff<T extends { id: string; name: string }>(
  label: string,
  staff: readonly T[],
): T | null {
  const key = toSearchKey(label);
  if (!key) return null;
  const hits = staff.filter((entry) => {
    const name = toSearchKey(entry.name);
    return name === key || name.endsWith(` ${key}`);
  });
  return hits.length === 1 ? hits[0]! : null;
}
