import type { TxContext } from "@lavieco/service-kit/ports";
import type {
  SalesOrderListQuery,
  SalesOrderStatus,
  SalesOrderView,
  StaffRef,
} from "@lavieco/shared/sales";

import type { PriceItemRecord } from "../domain/price-item";
import type { SalesOrderRecord } from "../domain/sales-order";

export const SALES_ORDER_REPOSITORY = Symbol("SALES_ORDER_REPOSITORY");
export const PRICE_ITEM_REPOSITORY = Symbol("PRICE_ITEM_REPOSITORY");
export const STAFF_DIRECTORY = Symbol("STAFF_DIRECTORY");

/** Fields written on create; the repository adds `revision`, `createdAt`, `updatedAt`. */
export type SalesOrderWrite = Omit<SalesOrderRecord, "revision" | "createdAt" | "updatedAt">;

export type SalesOrderChanges = Omit<
  SalesOrderWrite,
  "id" | "code" | "legacyCode" | "source" | "shopOrderId" | "createdBy" | "deletedAt"
>;

export type MonthRevenue = { month: string; orders: number; revenue: number };

export interface SalesOrderRepository {
  newId(): string;
  /** Next manual order number (`counters`, `_id: "sales_order"`), inside the transaction. */
  nextSeq(tx: TxContext): Promise<number>;
  insert(record: SalesOrderWrite, tx?: TxContext): Promise<SalesOrderRecord>;
  findById(id: string): Promise<SalesOrderRecord | null>;
  findByLegacyCode(legacyCode: string): Promise<SalesOrderRecord | null>;
  findByShopOrderId(shopOrderId: string, tx?: TxContext): Promise<SalesOrderRecord | null>;
  /** Optimistic lock: `null` when the revision moved on. */
  update(
    id: string,
    revision: number,
    changes: Partial<SalesOrderChanges> & { deletedAt?: Date | null },
    tx?: TxContext,
  ): Promise<SalesOrderRecord | null>;
  /** Website mirror: overwritten from the shop order, team fields left alone. */
  upsertMirror(
    shopOrderId: string,
    insert: SalesOrderWrite,
    mirrored: Partial<SalesOrderChanges>,
    tx?: TxContext,
  ): Promise<void>;
  /** Manual orders among `ids`, not deleted; returns how many changed. */
  setStatusMany(
    ids: string[],
    status: SalesOrderStatus,
    updatedBy: StaffRef | null,
    tx?: TxContext,
  ): Promise<number>;
  list(
    query: SalesOrderListQuery,
    today: string,
  ): Promise<{ items: SalesOrderRecord[]; nextCursor: string | null; total: number }>;
  countViews(today: string): Promise<Record<SalesOrderView, number>>;
  countByStatus(): Promise<Record<SalesOrderStatus, number>>;
  outstanding(): Promise<{ orders: number; amount: number }>;
  revenueByMonth(fromMonth: string): Promise<MonthRevenue[]>;
  latestByPhone(
    phoneNormalized: string,
  ): Promise<{ order: SalesOrderRecord; orders: number } | null>;
  /** Everything not deleted, oldest first: the Google Sheet export. */
  listAllForExport(): Promise<SalesOrderRecord[]>;
}

export interface PriceItemRepository {
  newId(): string;
  list(): Promise<PriceItemRecord[]>;
  findById(id: string): Promise<PriceItemRecord | null>;
  findByIds(ids: string[]): Promise<PriceItemRecord[]>;
  findByName(name: string): Promise<PriceItemRecord | null>;
  insert(
    record: Omit<PriceItemRecord, "revision" | "updatedAt">,
    tx?: TxContext,
  ): Promise<PriceItemRecord>;
  update(
    id: string,
    revision: number,
    changes: Partial<Omit<PriceItemRecord, "id" | "revision" | "updatedAt">>,
    tx?: TxContext,
  ): Promise<PriceItemRecord | null>;
}

/** Active staff accounts from identity-service: assignees and author names. */
export interface StaffDirectory {
  list(): Promise<StaffRef[]>;
}
