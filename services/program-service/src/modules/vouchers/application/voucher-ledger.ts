import type { TxContext } from "@lavieco/service-kit/ports";
import { DomainError, normalizeEmail } from "@lavieco/shared";

import {
  appliesToEvent,
  customerKeyOf,
  isLive,
  quoteVoucher,
  type VoucherContext,
  type VoucherRecord,
} from "../domain/voucher";
import {
  RedemptionTakenError,
  type RateLimiter,
  type VoucherRedemptionRepository,
  type VoucherRepository,
} from "./ports/voucher-repository.port";

/** Per IP and per email: enough for typos, too few to try codes. */
const CHECK_LIMITS = { ip: 20, email: 10, windowSeconds: 600 } as const;

export type VoucherQuote = { voucher: VoucherRecord; discount: number };
export type VoucherCustomer = { email: string; userId: string | null };

/**
 * What checkout needs from vouchers. A use follows the seats of its order: `held` when
 * the order holds seats, `redeemed` when paid, `released` on expiry or cancellation.
 * Everything runs in the caller's transaction (BR-14). A refund gives no use back (BR-18).
 */
export class VoucherLedger {
  constructor(
    private readonly vouchers: VoucherRepository,
    private readonly redemptions: VoucherRedemptionRepository,
    private readonly limiter: RateLimiter,
    private readonly hashKey: (value: string) => string,
  ) {}

  /** Throws `common.rate_limited` once this IP or email tried too many codes. */
  async throttleCheck(input: { clientIp?: string; email?: string }, now = new Date()) {
    const checks = [
      input.clientIp ? { key: `ip:${input.clientIp}`, limit: CHECK_LIMITS.ip } : null,
      input.email
        ? { key: `email:${normalizeEmail(input.email)}`, limit: CHECK_LIMITS.email }
        : null,
    ].filter((check) => check !== null);
    for (const check of checks) {
      const result = await this.limiter.hit(
        this.hashKey(`voucher:${check.key}`),
        check.limit,
        CHECK_LIMITS.windowSeconds,
        now,
      );
      if (!result.allowed) {
        throw new DomainError("common.rate_limited", undefined, {
          retryAfterSeconds: result.retryAfterSeconds,
        });
      }
    }
  }

  /** The discount for this order, or the one generic `voucher.invalid`. */
  async quote(code: string, context: VoucherContext): Promise<VoucherQuote> {
    const voucher = await this.vouchers.findByCode(code);
    if (!voucher) throw new DomainError("voucher.invalid");
    const discount = quoteVoucher(voucher, context);
    if (context.email !== null) {
      const taken = await this.redemptions.countActive(
        voucher.id,
        customerKeyOf({ userId: context.userId, email: context.email }),
        normalizeEmail(context.email),
      );
      if (taken >= voucher.perCustomer) throw new DomainError("voucher.invalid");
    }
    if (voucher.totalUses !== null && voucher.used + voucher.held >= voucher.totalUses) {
      throw new DomainError("voucher.invalid");
    }
    return { voucher, discount };
  }

  /** Public vouchers of an event page or "Chọn ưu đãi", with uses left. */
  async listPublic(event: { id: string; typeId: string }, now = new Date()) {
    const vouchers = await this.vouchers.listPublic(event.id);
    return vouchers
      .filter(
        (voucher) =>
          isLive(voucher, now) &&
          appliesToEvent(voucher, event.id, event.typeId) &&
          (voucher.totalUses === null || voucher.used + voucher.held < voucher.totalUses),
      )
      .map((voucher) => ({
        voucher,
        remaining:
          voucher.totalUses === null ? null : voucher.totalUses - voucher.used - voucher.held,
      }));
  }

  /** Takes one use for a new order: `redeemed` right away when nothing is left to pay. */
  async take(
    quote: VoucherQuote,
    orderId: string,
    customer: VoucherCustomer,
    state: "held" | "redeemed",
    now: Date,
    tx: TxContext,
  ): Promise<void> {
    const { voucher } = quote;
    const customerKey = customerKeyOf(customer);
    const emailNormalized = normalizeEmail(customer.email);
    const slot = await this.redemptions.countActive(voucher.id, customerKey, emailNormalized, tx);
    if (slot >= voucher.perCustomer) throw new DomainError("voucher.invalid");
    const into = state === "held" ? "held" : "used";
    if (!(await this.vouchers.take(voucher.id, into, now, tx))) {
      throw new DomainError("voucher.invalid");
    }
    try {
      await this.redemptions.insert(
        { voucherId: voucher.id, orderId, customerKey, emailNormalized, state, slot, at: now },
        tx,
      );
    } catch (error) {
      if (error instanceof RedemptionTakenError) throw new DomainError("voucher.invalid");
      throw error;
    }
  }

  /** The order was paid while holding its use. */
  async redeem(orderId: string, now: Date, tx: TxContext) {
    const moved = await this.redemptions.transition(orderId, "held", "redeemed", now, tx);
    if (moved) await this.vouchers.convertHeld(moved.voucherId, tx);
  }

  /** The order ended unpaid: the use goes back for someone else. */
  async release(orderId: string, now: Date, tx: TxContext) {
    const moved = await this.redemptions.transition(orderId, "held", "released", now, tx);
    if (moved) await this.vouchers.releaseHeld(moved.voucherId, tx);
  }

  /** Money came after the hold ended, at the discounted price: the use counts again. */
  async redeemLate(orderId: string, now: Date, tx: TxContext) {
    const moved = await this.redemptions.transition(orderId, "released", "redeemed", now, tx);
    if (moved) await this.vouchers.addUsed(moved.voucherId, tx);
  }
}
