import type { TxContext } from "@lavieco/service-kit/ports";
import type { VoucherListQuery, VoucherStatus } from "@lavieco/shared/events";

import type { VoucherChanges, VoucherRecord } from "../../domain/voucher";

export const VOUCHER_REPOSITORY = Symbol("VOUCHER_REPOSITORY");
export const VOUCHER_REDEMPTION_REPOSITORY = Symbol("VOUCHER_REDEMPTION_REPOSITORY");
export const RATE_LIMITER = Symbol("VOUCHER_RATE_LIMITER");

/** Thrown by `insert`/`update` when another voucher already has the code. */
export class VoucherCodeTakenError extends Error {
  override name = "VoucherCodeTakenError";
}

/** Thrown by a redemption insert that lost the race for the customer's last use. */
export class RedemptionTakenError extends Error {
  override name = "RedemptionTakenError";
}

export interface VoucherRepository {
  newId(): string;
  insert(id: string, changes: VoucherChanges, tx?: TxContext): Promise<VoucherRecord>;
  update(
    id: string,
    revision: number,
    changes: VoucherChanges,
    tx?: TxContext,
  ): Promise<VoucherRecord | null>;
  setStatus(
    id: string,
    revision: number,
    status: VoucherStatus,
    tx?: TxContext,
  ): Promise<VoucherRecord | null>;
  findById(id: string): Promise<VoucherRecord | null>;
  findByCode(code: string): Promise<VoucherRecord | null>;
  list(query: VoucherListQuery): Promise<{ items: VoucherRecord[]; nextCursor: string | null }>;
  /** Active, public vouchers that may apply to the event; time and event rules are the domain's. */
  listPublic(eventId: string): Promise<VoucherRecord[]>;

  /**
   * Counters, like seats (BR-14): `take` adds one to `held` or `used` only if the voucher
   * is still active and `used + held < totalUses`, so a limited code can never go over.
   */
  take(id: string, into: "held" | "used", now: Date, tx: TxContext): Promise<boolean>;
  convertHeld(id: string, tx: TxContext): Promise<void>;
  releaseHeld(id: string, tx: TxContext): Promise<void>;
  /** A late payment already made at the discounted price: counted even over the limit. */
  addUsed(id: string, tx: TxContext): Promise<void>;
}

export type RedemptionState = "held" | "redeemed" | "released";

export type RedemptionRecord = {
  voucherId: string;
  orderId: string;
  customerKey: string;
  emailNormalized: string;
  state: RedemptionState;
};

export interface VoucherRedemptionRepository {
  /** `slot` makes the unique index enforce `perCustomer` even when requests race. */
  insert(redemption: RedemptionRecord & { slot: number; at: Date }, tx: TxContext): Promise<void>;
  /** Uses still counting (held or redeemed) by this member or this email. */
  countActive(
    voucherId: string,
    customerKey: string,
    email: string,
    tx?: TxContext,
  ): Promise<number>;
  findByOrder(orderId: string, tx?: TxContext): Promise<RedemptionRecord | null>;
  transition(
    orderId: string,
    from: RedemptionState,
    to: RedemptionState,
    at: Date,
    tx: TxContext,
  ): Promise<RedemptionRecord | null>;
}

export interface RateLimiter {
  hit(
    key: string,
    limit: number,
    windowSeconds: number,
    now: Date,
  ): Promise<{ allowed: boolean; retryAfterSeconds: number }>;
}
