import type { TxContext } from "@lavieco/service-kit/ports";
import type { ShopOrderListQuery, ShopOrderStatus } from "@lavieco/shared/shop";

import type { ShopOrderRecord } from "../domain/shop-order";

export const SHOP_ORDER_REPOSITORY = Symbol("SHOP_ORDER_REPOSITORY");
export const SHOP_ORDER_MAILER = Symbol("SHOP_ORDER_MAILER");

export interface ShopOrderRepository {
  newId(): string;
  insert(order: ShopOrderRecord, tx: TxContext): Promise<void>;
  findById(id: string): Promise<ShopOrderRecord | null>;
  findByOrderCode(orderCode: number, tx?: TxContext): Promise<ShopOrderRecord | null>;
  findByVerificationId(verificationId: string): Promise<ShopOrderRecord | null>;
  /** Guarded update: only when the order is still in `from` (and at `revision` if given). */
  transition(
    id: string,
    from: readonly ShopOrderStatus[],
    set: Partial<Omit<ShopOrderRecord, "id">>,
    entry: { status: ShopOrderStatus; at: Date; actorId: string | null },
    tx: TxContext,
    revision?: number,
  ): Promise<ShopOrderRecord | null>;
  setPayment(id: string, payment: ShopOrderRecord["payment"]): Promise<void>;
  list(query: ShopOrderListQuery): Promise<{ items: ShopOrderRecord[]; nextCursor: string | null }>;
  listByEmail(emailNormalized: string, limit: number): Promise<ShopOrderRecord[]>;
  listByUser(userId: string, limit: number): Promise<ShopOrderRecord[]>;
  countPendingByEmail(emailNormalized: string): Promise<number>;
  countPaidBy(emailNormalized: string, userId: string | null): Promise<number>;
  dueForExpiry(now: Date, limit: number): Promise<ShopOrderRecord[]>;
  /** Paid amount since `from`, and counts per status for the overview. */
  revenueSince(from: Date): Promise<number>;
  countByStatus(statuses: readonly ShopOrderStatus[]): Promise<number>;
  countFlagged(): Promise<number>;
  claimForUser(emailNormalized: string, userId: string): Promise<void>;
  /** Every order created in the window, for the Excel export. */
  listForExport(from: Date, to: Date): Promise<ShopOrderRecord[]>;
}

/** Order emails: confirmation (with payment or COD note), shipped, delivered. */
export interface ShopOrderMailer {
  send(
    orderId: string,
    kind: "placed" | "paid" | "shipped" | "cancelled" | "review",
  ): Promise<void>;
}
