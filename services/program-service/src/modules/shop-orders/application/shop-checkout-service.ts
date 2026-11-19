import type { OutboxPort, TxContext, UnitOfWork } from "@lavieco/service-kit/ports";
import { DomainError, normalizeEmail } from "@lavieco/shared";
import {
  SHOP_ORDER_LIMITS,
  type ShopOrderCreateRequest,
  type ShopQuote,
  type ShopQuoteRequest,
} from "@lavieco/shared/shop";

import type { EmailProofVerifier, OrderLinks, PaymentGateway } from "../../orders";
import type { CartService } from "../../shop-carts";
import type { CatalogRepository, ProductRepository } from "../../shop-catalog";
import type { VoucherLedger, VoucherQuote } from "../../vouchers";
import {
  codAllowed,
  newPublicCode,
  newShopOrderCode,
  shippingFeeOf,
  type ShopOrderItem,
  type ShopOrderRecord,
  resolveShippingAddress,
} from "../domain/shop-order";
import type { ShopOrderRepository } from "./ports";
import { SHOP_ORDER_JOBS } from "./shop-order-jobs";

/** payOS refuses tiny amounts; a discounted order below this cannot be paid online. */
const PAYMENT_MIN_AMOUNT = 2_000;

export type ShopCheckoutConfig = { webAppUrl: string };

type Priced = {
  quote: ShopQuote;
  voucher: VoucherQuote | null;
  items: ShopOrderItem[];
};

/**
 * Shop checkout (UC-37, docs/08 §7.2). Prices come from the catalogue and the settings,
 * never from the client (BR-21); the email is proven first (BR-12); stock is held in the
 * same transaction as the order and the voucher use (BR-22, BR-18), then the payOS link
 * is created outside it.
 */
export class ShopCheckoutService {
  constructor(
    private readonly orders: ShopOrderRepository,
    private readonly products: ProductRepository,
    private readonly catalog: CatalogRepository,
    private readonly carts: CartService,
    private readonly vouchers: VoucherLedger,
    private readonly proofs: EmailProofVerifier,
    private readonly gateway: PaymentGateway,
    private readonly links: OrderLinks,
    private readonly unitOfWork: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly config: ShopCheckoutConfig,
  ) {}

  /** What the order would cost now; a refused code answers `voucherRefused`, never an error. */
  async quote(input: ShopQuoteRequest, now = new Date()): Promise<ShopQuote> {
    const priced = await this.price(input.cartToken, input.shippingMethod, input.voucherCode, {
      email: input.email ? normalizeEmail(input.email) : null,
      userId: null,
      now,
      strictVoucher: false,
      wardCode: input.wardCode ?? null,
    });
    return priced.quote;
  }

  async create(input: ShopOrderCreateRequest, now = new Date()) {
    const proof = await this.proofs.verify(input.verificationToken, "checkout");
    const emailNormalized = normalizeEmail(input.buyer.email);
    if (proof.email !== emailNormalized) throw new DomainError("order.email_mismatch");

    // One proof, one order: a retried request gets the order it already created.
    const existing = await this.orders.findByVerificationId(proof.sub);
    if (existing) return this.bundle(existing);

    if (
      (await this.orders.countPendingByEmail(emailNormalized)) >= SHOP_ORDER_LIMITS.pendingPerEmail
    ) {
      throw new DomainError("shop_order.too_many_pending");
    }
    const settings = await this.catalog.getSettings();
    const userId = proof.uid ?? null;
    const { quote, voucher, items } = await this.price(
      input.cartToken,
      input.shipping.method,
      input.voucherCode,
      {
        email: emailNormalized,
        userId,
        now,
        strictVoucher: true,
        wardCode: input.shipping.address?.wardCode ?? null,
      },
    );
    if (items.length === 0) throw new DomainError("shop_order.cart_empty");
    // BR-21: what the buyer saw must still be true; otherwise they look again.
    if (quote.hasIssues) throw new DomainError("shop_order.cart_changed");
    if (input.paymentMethod === "cod" && !codAllowed(settings, quote.amount)) {
      throw new DomainError("shop_order.cod_not_allowed");
    }
    const online = input.paymentMethod === "payos" && quote.amount > 0;
    if (online && quote.amount < PAYMENT_MIN_AMOUNT)
      throw new DomainError("voucher.amount_too_low");
    if (online && !this.gateway.enabled) throw new DomainError("payment.unavailable");

    let orderCode = newShopOrderCode();
    while (await this.orders.findByOrderCode(orderCode)) orderCode = newShopOrderCode();
    const free = quote.amount === 0;
    const status = free
      ? "confirmed"
      : input.paymentMethod === "cod"
        ? "awaiting_confirmation"
        : "awaiting_payment";
    const holdMs = settings.holdMinutes * 60 * 1000;
    const order: ShopOrderRecord = {
      id: this.orders.newId(),
      orderCode,
      publicCode: newPublicCode(),
      userId,
      verificationId: proof.sub,
      buyer: {
        fullName: input.buyer.fullName,
        email: input.buyer.email,
        emailNormalized,
        phone: input.buyer.phone,
      },
      shipping: {
        method: input.shipping.method,
        recipientName: input.shipping.recipientName,
        recipientPhone: input.shipping.recipientPhone,
        address:
          input.shipping.method === "delivery" && input.shipping.address
            ? resolveShippingAddress(input.shipping.address)
            : null,
        note: input.shipping.note,
      },
      items,
      subtotal: quote.subtotal,
      discount: voucher
        ? { voucherId: voucher.voucher.id, code: voucher.voucher.code, amount: voucher.discount }
        : null,
      shippingFee: quote.shippingFee,
      amount: quote.amount,
      paymentMethod: free ? "payos" : input.paymentMethod,
      status,
      stockState: free ? "committed" : "held",
      // COD waits for the team's call (48 h at most); payOS for the hold time.
      expiresAt: free
        ? null
        : new Date(now.getTime() + (input.paymentMethod === "cod" ? 48 * 3_600_000 : holdMs)),
      paidAt: free ? now : null,
      tracking: null,
      statusHistory: [{ status, at: now, actorId: null }],
      consent: { version: input.consentVersion, at: now },
      flags: { refundRequired: false, amountMismatch: false, latePayment: false },
      payment: null,
      refundNote: "",
      revision: 1,
      createdAt: now,
      updatedAt: now,
    };

    await this.unitOfWork.run(async (tx) => {
      for (const item of items) {
        if (!(await this.products.reserveStock(item.variantId, item.quantity, tx))) {
          throw new DomainError("shop_order.out_of_stock", undefined, { sku: item.sku });
        }
        if (free) await this.products.commitStock(item.variantId, item.quantity, tx);
      }
      if (voucher) {
        await this.vouchers.take(
          voucher,
          order.id,
          { email: emailNormalized, userId },
          free ? "redeemed" : "held",
          now,
          tx,
        );
      }
      await this.orders.insert(order, tx);
      await this.jobs(order, tx, free ? ["placed", "alert_paid"] : ["placed", "alert_new"]);
    });

    if (online) {
      try {
        const payment = await this.gateway.createLink({
          orderCode,
          amount: order.amount,
          items: items.map((item) => ({
            name: item.title.slice(0, 50),
            quantity: item.quantity,
            price: item.unitPrice,
          })),
          returnUrl: `${this.config.webAppUrl}/thanh-toan/${this.links.sign(order.id)}`,
          cancelUrl: `${this.config.webAppUrl}/thanh-toan/${this.links.sign(order.id)}?huy=1`,
          expiresAt: order.expiresAt!,
        });
        await this.orders.setPayment(order.id, payment);
        order.payment = payment;
      } catch (error) {
        // No link: give the stock back at once rather than at expiry.
        await this.cancelUnpaid(order.id, now);
        throw error instanceof DomainError ? error : new DomainError("payment.unavailable");
      }
    }
    await this.carts.removeVariants(
      input.cartToken,
      items.map((item) => item.variantId),
    );
    return this.bundle(order);
  }

  /** The buyer gave up on the payment page: release now (BR-22). */
  async cancelByBuyer(token: string, now = new Date()) {
    const id = this.links.verify(token);
    const order = id ? await this.orders.findById(id) : null;
    if (!order) throw new DomainError("common.not_found");
    if (order.status !== "awaiting_payment") throw new DomainError("order.invalid_state");
    await this.cancelUnpaid(order.id, now);
    return this.bundle((await this.orders.findById(order.id))!);
  }

  async byToken(token: string) {
    const id = this.links.verify(token);
    const order = id ? await this.orders.findById(id) : null;
    if (!order) throw new DomainError("common.not_found");
    return order;
  }

  /** `/tra-cuu-don`: every order of a proven email (`purpose: ticket_lookup`). */
  async lookup(verificationToken: string) {
    const proof = await this.proofs.verify(verificationToken, "ticket_lookup");
    const orders = await this.orders.listByEmail(proof.email, 50);
    return orders.map((order) => ({ order, accessToken: this.links.sign(order.id) }));
  }

  async listForMember(userId: string) {
    const orders = await this.orders.listByUser(userId, 50);
    return orders.map((order) => ({ order, accessToken: this.links.sign(order.id) }));
  }

  /** Unpaid order ends: stock and voucher use go back, the payOS link is cancelled. */
  async cancelUnpaid(orderId: string, now: Date, to: "cancelled" | "expired" = "cancelled") {
    await this.unitOfWork.run(async (tx) => {
      const order = await this.orders.transition(
        orderId,
        ["awaiting_payment", "awaiting_confirmation"],
        { status: to, stockState: "released", expiresAt: null },
        { status: to, at: now, actorId: null },
        tx,
      );
      if (!order) return;
      for (const item of order.items)
        await this.products.releaseStock(item.variantId, item.quantity, tx);
      await this.vouchers.release(order.id, now, tx);
      if (order.payment) {
        await this.outbox.enqueue(tx, { type: SHOP_ORDER_JOBS.cancelLink, payload: { orderId } });
      }
    });
  }

  private bundle(order: ShopOrderRecord) {
    return { order, accessToken: this.links.sign(order.id) };
  }

  private jobs(
    order: ShopOrderRecord,
    tx: TxContext,
    kinds: ("placed" | "alert_new" | "alert_paid")[],
  ) {
    return Promise.all(
      kinds.map((kind) =>
        this.outbox.enqueue(tx, {
          type: kind === "placed" ? SHOP_ORDER_JOBS.email : SHOP_ORDER_JOBS.alert,
          payload: {
            orderId: order.id,
            kind: kind === "placed" ? "placed" : kind === "alert_paid" ? "paid" : "new",
          },
        }),
      ),
    );
  }

  private async price(
    cartToken: string,
    method: "delivery" | "pickup",
    code: string | undefined,
    customer: {
      email: string | null;
      userId: string | null;
      now: Date;
      strictVoucher: boolean;
      wardCode: number | null;
    },
  ): Promise<Priced> {
    const cart = await this.carts.view(cartToken);
    const settings = await this.catalog.getSettings();
    const lines = cart.lines.filter((line) => line.quantity > 0);
    const hasIssues = cart.lines.some((line) => line.issue !== null);
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const shippingFee =
      lines.length > 0 ? shippingFeeOf(settings, method, subtotal, customer.wardCode) : 0;
    let voucher: VoucherQuote | null = null;
    let voucherRefused = false;
    if (code && lines.length > 0) {
      try {
        voucher = await this.vouchers.quoteShop(code, {
          subtotal,
          items: lines.reduce((sum, line) => sum + line.quantity, 0),
          shippingFee,
          email: customer.email,
          userId: customer.userId,
          paidOrders: customer.email
            ? await this.orders.countPaidBy(customer.email, customer.userId)
            : 0,
          now: customer.now,
        });
      } catch (error) {
        if (customer.strictVoucher) throw error;
        voucherRefused = true;
      }
    }
    const discount = voucher?.discount ?? 0;
    const amount = Math.max(0, subtotal + shippingFee - discount);

    const variants = await this.products.findVariants(lines.map((l) => l.variantId));
    const products = await this.products.findByIds([...new Set(variants.map((v) => v.productId))]);
    const brands = await this.catalog.listBrands();
    const byVariant = new Map(variants.map((v) => [v.id, v]));
    const byProduct = new Map(products.map((p) => [p.id, p]));
    const items: ShopOrderItem[] = lines.map((line) => {
      const product = byProduct.get(byVariant.get(line.variantId)?.productId ?? "");
      const brand = product?.partnerBrandId
        ? brands.find((b) => b.id === product.partnerBrandId)
        : undefined;
      return {
        productId: product?.id ?? "",
        variantId: line.variantId,
        productSlug: line.productSlug,
        title: line.title,
        optionLabel: line.optionLabel,
        sku: line.sku,
        image: line.image,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
        partnerBrandId: brand?.id ?? null,
        commissionRate: brand?.commissionRate ?? null,
      };
    });
    return {
      quote: {
        lines: cart.lines,
        subtotal,
        shippingFee,
        discount,
        amount,
        voucher: voucher ? { code: voucher.voucher.code, amount: voucher.discount } : null,
        voucherRefused,
        codAvailable: codAllowed(settings, amount),
        hasIssues,
      },
      voucher,
      items,
    };
  }
}
