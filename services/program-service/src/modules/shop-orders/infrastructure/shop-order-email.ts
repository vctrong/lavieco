import {
  emailButton,
  emailDetails,
  emailPanel,
  emailParagraph,
  emailSubheading,
  escapeHtml,
  renderEmail,
} from "@lavieco/service-kit";
import type { EmailSender } from "@lavieco/service-kit/ports";

import type { OrderLinks } from "../../orders";
import type { CatalogRepository } from "../../shop-catalog";
import type { ShopOrderMailer, ShopOrderRepository } from "../application/ports";
import { addressText, type ShopOrderRecord } from "../domain/shop-order";

const MONEY = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

type Kind = "placed" | "paid" | "shipped" | "cancelled";

const SUBJECT: Record<Kind, (code: string) => string> = {
  placed: (code) => `Đã nhận đơn ${code}`,
  paid: (code) => `Đã thanh toán đơn ${code}`,
  shipped: (code) => `Đơn ${code} đang được giao`,
  cancelled: (code) => `Đơn ${code} đã huỷ`,
};

function intro(kind: Kind, order: ShopOrderRecord): string {
  if (kind === "paid") return "LAVIECO đã nhận được thanh toán. Đội sẽ đóng gói và gửi hàng sớm.";
  if (kind === "shipped") {
    return order.shipping.method === "pickup"
      ? "Đơn của bạn đã sẵn sàng để nhận tại chỗ."
      : "Đơn của bạn đã được giao cho đơn vị vận chuyển.";
  }
  if (kind === "cancelled") {
    return order.paidAt
      ? "Đơn đã huỷ. Đội LAVIECO sẽ liên hệ để hoàn tiền bằng chuyển khoản."
      : "Đơn đã huỷ. Bạn không bị trừ khoản nào.";
  }
  if (order.paymentMethod === "cod") {
    return "LAVIECO sẽ gọi điện xác nhận đơn trước khi giao. Bạn thanh toán khi nhận hàng.";
  }
  return order.paidAt
    ? "Cảm ơn bạn đã đặt hàng."
    : "Đơn đang chờ thanh toán. Hàng được giữ cho bạn trong thời gian ngắn.";
}

/**
 * Order emails (shared layout, `renderEmail`). Every one carries the story note: each
 * product comes with its story card and a link into the Cẩm nang (BR-01).
 */
export class SmtpShopOrderMailer implements ShopOrderMailer {
  constructor(
    private readonly orders: ShopOrderRepository,
    private readonly catalog: CatalogRepository,
    private readonly links: OrderLinks,
    private readonly sender: EmailSender,
    private readonly webAppUrl: string,
  ) {}

  async send(orderId: string, kind: Kind) {
    const order = await this.orders.findById(orderId);
    if (!order) return;
    const settings = await this.catalog.getSettings();
    const url = `${this.webAppUrl}/don-hang/${this.links.sign(order.id)}`;
    const greeting = `Xin chào ${order.buyer.fullName},`;
    const lead = intro(kind, order);
    const lines = order.items.map(
      (item) =>
        [
          `${item.title}${item.optionLabel ? ` (${item.optionLabel})` : ""} × ${item.quantity}`,
          MONEY.format(item.unitPrice * item.quantity),
        ] as const,
    );
    const totals: (readonly [string, string])[] = [
      ["Tạm tính", MONEY.format(order.subtotal)],
      ...(order.discount ? [["Giảm giá", `−${MONEY.format(order.discount.amount)}`] as const] : []),
      ["Phí giao", MONEY.format(order.shippingFee)],
      ["Tổng", MONEY.format(order.amount)],
    ];
    const where = addressText(order.shipping, settings.pickup.address);
    const tracking =
      kind === "shipped" && order.tracking
        ? emailParagraph(escapeHtml(`Vận đơn: ${order.tracking.carrier} ${order.tracking.code}`))
        : "";

    const bodyHtml = [
      emailParagraph(`${escapeHtml(greeting)}<br>${escapeHtml(lead)}`),
      emailPanel(
        emailSubheading(`Đơn ${order.publicCode}`) +
          emailDetails(lines.map(([a, b]) => [escapeHtml(a), escapeHtml(b)] as const)) +
          emailDetails(totals.map(([a, b]) => [escapeHtml(a), escapeHtml(b)] as const)) +
          emailDetails([
            [order.shipping.method === "pickup" ? "Nhận tại" : "Giao tới", escapeHtml(where)],
            ["Người nhận", escapeHtml(order.shipping.recipientName)],
          ]),
      ),
      tracking,
      emailParagraph(
        escapeHtml(
          `Mỗi sản phẩm kèm story card và đường dẫn vào Cẩm nang xanh số. Đổi trả trong ${settings.returnDays} ngày nếu sản phẩm lỗi (phí gửi trả do người mua chịu).`,
        ),
        { muted: true, small: true },
      ),
      emailButton("Xem đơn hàng", url),
    ].join("\n");

    const textLines = [
      greeting,
      lead,
      "",
      `Đơn ${order.publicCode}`,
      ...lines.map(([a, b]) => `${a}: ${b}`),
      ...totals.map(([a, b]) => `${a}: ${b}`),
      `${order.shipping.method === "pickup" ? "Nhận tại" : "Giao tới"}: ${where}`,
      ...(kind === "shipped" && order.tracking
        ? [`Vận đơn: ${order.tracking.carrier} ${order.tracking.code}`]
        : []),
      "",
      `Xem đơn hàng: ${url}`,
    ];

    const mail = renderEmail({
      subject: SUBJECT[kind](order.publicCode),
      preheader: `${order.publicCode} · ${MONEY.format(order.amount)}`,
      eyebrow: "Cửa hàng LAVIECO",
      heading: SUBJECT[kind](order.publicCode),
      bodyHtml,
      textLines,
      reason: "Bạn nhận email này vì đã đặt hàng trên website LAVIECO bằng địa chỉ email này.",
      siteUrl: this.webAppUrl,
    });
    await this.sender.send({ to: order.buyer.email, ...mail });
  }
}
