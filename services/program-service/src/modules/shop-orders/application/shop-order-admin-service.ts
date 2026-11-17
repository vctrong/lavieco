import type { OutboxPort, UnitOfWork } from "@lavieco/service-kit/ports";
import { DomainError } from "@lavieco/shared";
import type { ShopOrderActionRequest, ShopOrderListQuery } from "@lavieco/shared/shop";
import type { Role } from "@lavieco/shared/permissions";

import type { AuditTrail } from "../../audit";
import type { SheetCell, Workbook, WorkbookWriter } from "../../registrations";
import type { CatalogRepository, ProductRepository } from "../../shop-catalog";
import type { VoucherLedger } from "../../vouchers";
import { allowedActions, nextStatus, type ShopOrderRecord } from "../domain/shop-order";
import type { ShopOrderRepository } from "./ports";
import { SHOP_ORDER_JOBS } from "./shop-order-jobs";

export type ShopOrderActor = { userId: string; roles: readonly Role[]; requestId: string | null };

const STATUS_TEXT: Record<ShopOrderRecord["status"], string> = {
  awaiting_payment: "Chờ thanh toán",
  awaiting_confirmation: "Chờ xác nhận (COD)",
  paid: "Đã thanh toán",
  confirmed: "Đã xác nhận",
  packing: "Đang đóng gói",
  shipped: "Đang giao",
  delivered: "Đã giao",
  completed: "Hoàn tất",
  cancelled: "Đã huỷ",
  expired: "Hết hạn",
  refunded: "Đã hoàn tiền",
  returned: "Đã trả hàng",
};

/**
 * Shop orders in the back office (UC-40): status changes with their stock and voucher
 * effects in one transaction, audited; refunds stay manual (BR-15). Export holds personal
 * data: the controller checks `order:export` and step-up.
 */
export class ShopOrderAdminService {
  constructor(
    private readonly orders: ShopOrderRepository,
    private readonly products: ProductRepository,
    private readonly catalog: CatalogRepository,
    private readonly vouchers: VoucherLedger,
    private readonly workbook: WorkbookWriter,
    private readonly audit: AuditTrail,
    private readonly unitOfWork: UnitOfWork,
    private readonly outbox: OutboxPort,
  ) {}

  list(query: ShopOrderListQuery) {
    return this.orders.list(query);
  }

  async get(id: string) {
    const order = await this.orders.findById(id);
    if (!order) throw new DomainError("common.not_found");
    return order;
  }

  async act(id: string, input: ShopOrderActionRequest, actor: ShopOrderActor, now = new Date()) {
    const order = await this.get(id);
    if (!allowedActions(order).includes(input.action))
      throw new DomainError("shop_order.invalid_action");
    const to = nextStatus(input.action);
    const set: Partial<ShopOrderRecord> = { status: to };
    if (input.action === "ship" && input.tracking) set.tracking = input.tracking;
    if (input.action === "mark_cod_paid") set.paidAt = now;
    if (input.action === "refund") {
      set.refundNote = input.note;
      set.flags = { ...order.flags, refundRequired: false };
    }

    const saved = await this.unitOfWork.run(async (tx) => {
      if (input.action === "confirm") {
        // COD confirmed by phone: the held goods become sold.
        for (const item of order.items)
          await this.products.commitStock(item.variantId, item.quantity, tx);
        await this.vouchers.redeem(order.id, now, tx);
        set.stockState = "committed";
        set.expiresAt = null;
      }
      if (input.action === "cancel" || input.action === "return") {
        if (order.stockState === "held") {
          for (const item of order.items)
            await this.products.releaseStock(item.variantId, item.quantity, tx);
          await this.vouchers.release(order.id, now, tx);
          set.stockState = "released";
        } else if (order.stockState === "committed" && input.restock) {
          for (const item of order.items)
            await this.products.restock(item.variantId, item.quantity, tx);
          set.stockState = "released";
        }
        // Money already in: someone must transfer it back (BR-15).
        if (order.paidAt) set.flags = { ...order.flags, refundRequired: true };
        set.expiresAt = null;
        if (order.payment && !order.paidAt) {
          await this.outbox.enqueue(tx, {
            type: SHOP_ORDER_JOBS.cancelLink,
            payload: { orderId: order.id },
          });
        }
      }
      const result = await this.orders.transition(
        order.id,
        [order.status],
        set,
        { status: to, at: now, actorId: actor.userId },
        tx,
        input.revision,
      );
      if (!result) throw new DomainError("common.conflict");
      const mail =
        input.action === "ship" ? "shipped" : input.action === "cancel" ? "cancelled" : null;
      if (mail)
        await this.outbox.enqueue(tx, {
          type: SHOP_ORDER_JOBS.email,
          payload: { orderId: order.id, kind: mail },
        });
      if (input.action === "refund" || input.action === "cancel") {
        await this.audit.record(
          tx,
          {
            action: input.action === "refund" ? "shop_order.refund" : "shop_order.cancel",
            actor: { userId: actor.userId, roles: actor.roles },
            target: { type: "shop_order", id: order.id },
            requestId: actor.requestId,
            meta: { orderCode: order.orderCode, amount: order.amount },
          },
          now,
        );
      }
      return result;
    });
    return saved;
  }

  async overview(now = new Date()) {
    const day = new Date(now);
    day.setUTCHours(day.getUTCHours() + 7);
    day.setUTCHours(0, 0, 0, 0);
    const today = new Date(day.getTime() - 7 * 3_600_000);
    const [todayRevenue, week, month, awaitingConfirmation, toPack, toShip, attention, low, out] =
      await Promise.all([
        this.orders.revenueSince(today),
        this.orders.revenueSince(new Date(now.getTime() - 7 * 86_400_000)),
        this.orders.revenueSince(new Date(now.getTime() - 30 * 86_400_000)),
        this.orders.countByStatus(["awaiting_confirmation"]),
        this.orders.countByStatus(["paid", "confirmed"]),
        this.orders.countByStatus(["packing"]),
        this.orders.countFlagged(),
        this.products.idsWithStock("low"),
        this.products.idsWithStock("out"),
      ]);
    return {
      revenue: { today: todayRevenue, week, month },
      todo: { awaitingConfirmation, toPack, toShip, attention },
      lowStock: new Set([...low, ...out]).size,
    };
  }

  /** `LAVIECO_don-hang_<day>.xlsx`: one row per order line, personal data included. */
  async export(range: { from: Date; to: Date }, actor: ShopOrderActor, now = new Date()) {
    const orders = await this.orders.listForExport(range.from, range.to);
    const settings = await this.catalog.getSettings();
    const rows: SheetCell[][] = [];
    let n = 0;
    for (const order of orders) {
      for (const item of order.items) {
        n += 1;
        const address =
          order.shipping.method === "pickup"
            ? `Nhận tại: ${settings.pickup.address}`
            : [
                order.shipping.address?.line,
                order.shipping.address?.ward,
                order.shipping.address?.province,
              ]
                .filter(Boolean)
                .join(", ");
        rows.push([
          n,
          order.publicCode,
          String(order.orderCode),
          order.createdAt,
          STATUS_TEXT[order.status],
          order.paymentMethod === "cod" ? "COD" : "payOS",
          order.paidAt,
          order.buyer.fullName,
          order.buyer.phone,
          order.buyer.email,
          order.shipping.recipientName,
          order.shipping.recipientPhone,
          address,
          item.sku,
          [item.title, item.optionLabel].filter(Boolean).join(" · "),
          item.quantity,
          item.unitPrice,
          item.unitPrice * item.quantity,
          order.subtotal,
          order.discount?.amount ?? null,
          order.shippingFee,
          order.amount,
          order.tracking ? `${order.tracking.carrier} ${order.tracking.code}`.trim() : null,
          order.shipping.note || null,
        ]);
      }
    }
    const tones = {
      "Đã thanh toán": "ok",
      "Đã xác nhận": "ok",
      "Đã giao": "ok",
      "Hoàn tất": "ok",
      "Chờ thanh toán": "warn",
      "Chờ xác nhận (COD)": "warn",
      "Đã huỷ": "muted",
      "Hết hạn": "muted",
      "Đã hoàn tiền": "bad",
    } as const;
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(now);
    const book: Workbook = {
      fileName: `LAVIECO_don-hang_${day}.xlsx`,
      table: {
        name: "Đơn hàng",
        columns: [
          { header: "STT", kind: "index" },
          { header: "Mã đơn", kind: "code" },
          { header: "Mã payOS", kind: "code" },
          { header: "Thời gian đặt", kind: "dateTime" },
          { header: "Trạng thái", kind: "status", tones },
          { header: "Thanh toán", kind: "text" },
          { header: "Thanh toán lúc", kind: "dateTime" },
          { header: "Người đặt", kind: "text" },
          { header: "SĐT người đặt", kind: "code" },
          { header: "Email", kind: "text" },
          { header: "Người nhận", kind: "text" },
          { header: "SĐT người nhận", kind: "code" },
          { header: "Địa chỉ giao", kind: "longText" },
          { header: "SKU", kind: "code" },
          { header: "Sản phẩm", kind: "longText" },
          { header: "SL", kind: "number" },
          { header: "Đơn giá", kind: "money" },
          { header: "Thành tiền", kind: "money" },
          { header: "Tạm tính đơn", kind: "money" },
          { header: "Giảm giá", kind: "money" },
          { header: "Phí giao", kind: "money" },
          { header: "Tổng đơn", kind: "money" },
          { header: "Vận đơn", kind: "code" },
          { header: "Ghi chú", kind: "longText" },
        ],
        rows,
      },
      summary: {
        name: "Tổng quan",
        title: "Đơn hàng Cửa hàng LAVIECO",
        lines: [
          ["Từ", range.from],
          ["Đến", range.to],
          ["Xuất lúc", now],
          ["Số đơn", orders.length],
          [
            "Doanh thu đã thu",
            orders
              .filter((o) => o.paidAt && o.status !== "refunded")
              .reduce((s, o) => s + o.amount, 0),
          ],
        ],
      },
    };
    const content = await this.workbook.write(book);
    await this.unitOfWork.run((tx) =>
      this.audit.record(
        tx,
        {
          action: "shop_order.export",
          actor: { userId: actor.userId, roles: actor.roles },
          target: { type: "shop_order", id: "export" },
          requestId: actor.requestId,
          meta: { orders: orders.length },
        },
        now,
      ),
    );
    return { fileName: book.fileName, content };
  }
}
