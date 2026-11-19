import type { TxContext, UnitOfWork } from "@lavieco/service-kit/ports";
import { DomainError, normalizePhone } from "@lavieco/shared";
import { resolveAddress, type Address, type AddressInput } from "@lavieco/shared/geo";
import type { Role } from "@lavieco/shared/permissions";
import {
  SALES_ORDER_STATUSES,
  type SalesOrderBulkStatusRequest,
  type SalesOrderInput,
  type SalesOrderListQuery,
  type SalesOrderQuickUpdateRequest,
  type SalesOrderTeamFieldsRequest,
  type SalesOrderUpdateRequest,
  type SalesSummary,
  type StaffRef,
} from "@lavieco/shared/sales";

import type { AuditTrail, ProgramAuditAction } from "../../audit";
import {
  assertDueDay,
  computeTotals,
  manualOrderCode,
  vnDay,
  type SalesOrderRecord,
} from "../domain/sales-order";
import type {
  PriceItemRepository,
  SalesOrderChanges,
  SalesOrderRepository,
  SalesOrderWrite,
  StaffDirectory,
} from "./ports";
import type { SalesSheetQueue } from "./sales-jobs";

export type SalesActor = { userId: string; roles: readonly Role[]; requestId: string | null };

export function toAddress(input: AddressInput | null): Address | null {
  if (input === null) return null;
  if (input.provinceCode === null && input.detail.trim() === "") return null;
  try {
    return resolveAddress(input);
  } catch {
    throw new DomainError("address.invalid");
  }
}

const monthsBack = (today: string, months: number) => {
  const [year, month] = today.split("-").map(Number) as [number, number];
  const index = year * 12 + (month - 1) - (months - 1);
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
};

/**
 * The team's order book (UC-41..44, ADR-0030). Manual orders are fully editable by anyone
 * with `sales:write`; website mirrors only take the team fields (assignee, due day, note).
 * Totals are always computed here. Deletes are soft (BR-04 spirit), with restore.
 */
export class SalesOrderService {
  constructor(
    private readonly orders: SalesOrderRepository,
    private readonly priceItems: PriceItemRepository,
    private readonly staff: StaffDirectory,
    private readonly unitOfWork: UnitOfWork,
    private readonly audit: AuditTrail,
    private readonly sheet: SalesSheetQueue,
  ) {}

  list(query: SalesOrderListQuery, now = new Date()) {
    return this.orders.list(query, vnDay(now));
  }

  async get(id: string) {
    const order = await this.orders.findById(id);
    if (!order) throw new DomainError("common.not_found");
    return order;
  }

  assignees() {
    return this.staff.list();
  }

  async create(input: SalesOrderInput, actor: SalesActor, now = new Date()) {
    const author = await this.authorOf(actor);
    const changes = await this.changesOf(input, author, now);
    return this.unitOfWork.run(async (tx) => {
      const seq = await this.orders.nextSeq(tx);
      const record: SalesOrderWrite = {
        ...changes,
        id: this.orders.newId(),
        code: manualOrderCode(seq),
        legacyCode: null,
        source: "manual",
        shopOrderId: null,
        createdBy: author,
        deletedAt: null,
      };
      const saved = await this.orders.insert(record, tx);
      await this.sheet.queue(tx);
      return saved;
    });
  }

  async update(id: string, input: SalesOrderUpdateRequest, actor: SalesActor, now = new Date()) {
    const current = await this.editable(id);
    const changes = await this.changesOf(input, await this.authorOf(actor), now);
    return this.save(current.id, input.revision, changes);
  }

  /** Assignee, due day and note: the part of a website order the team owns. */
  async updateTeamFields(id: string, input: SalesOrderTeamFieldsRequest, actor: SalesActor) {
    const current = await this.get(id);
    if (current.deletedAt) throw new DomainError("common.not_found");
    assertDueDay(current.orderType, current.status, input.dueDay);
    return this.save(id, input.revision, {
      assignee: await this.assigneeOf(input.assigneeId),
      dueDay: input.dueDay,
      note: input.note,
      updatedBy: await this.authorOf(actor),
    });
  }

  async quickUpdate(id: string, input: SalesOrderQuickUpdateRequest, actor: SalesActor) {
    const current = await this.editable(id);
    const status = input.status ?? current.status;
    assertDueDay(current.orderType, status, current.dueDay);
    return this.save(id, input.revision, {
      status,
      paymentStatus: input.paymentStatus ?? current.paymentStatus,
      updatedBy: await this.authorOf(actor),
    });
  }

  async bulkStatus(input: SalesOrderBulkStatusRequest, actor: SalesActor, now = new Date()) {
    const ids = [...new Set(input.ids)];
    const author = await this.authorOf(actor);
    const updated = await this.unitOfWork.run(async (tx) => {
      const count = await this.orders.setStatusMany(ids, input.status, author, tx);
      await this.log("sales_order.bulk_status", "sales_order", "bulk", actor, now, tx, {
        status: input.status,
        count,
      });
      await this.sheet.queue(tx);
      return count;
    });
    return { updated, skipped: ids.length - updated };
  }

  async remove(id: string, revision: number, actor: SalesActor, now = new Date()) {
    await this.editable(id);
    return this.withAudit("sales_order.delete", id, revision, actor, now, {
      deletedAt: now,
      updatedBy: await this.authorOf(actor),
    });
  }

  async restore(id: string, revision: number, actor: SalesActor, now = new Date()) {
    const current = await this.get(id);
    if (!current.deletedAt) return current;
    return this.withAudit("sales_order.restore", id, revision, actor, now, {
      deletedAt: null,
      updatedBy: await this.authorOf(actor),
    });
  }

  async lookupCustomer(phone: string) {
    const phoneNormalized = normalizePhone(phone);
    if (!phoneNormalized) return null;
    const found = await this.orders.latestByPhone(phoneNormalized);
    if (!found) return null;
    const { order, orders } = found;
    return {
      name: order.customer.name,
      phone: order.customer.phone,
      address: order.customer.address,
      orders,
      lastOrderDay: order.orderDay,
    };
  }

  async summary(months: number, now = new Date()): Promise<SalesSummary> {
    const today = vnDay(now);
    const from = monthsBack(today, months);
    const [byStatus, views, outstanding, revenue] = await Promise.all([
      this.orders.countByStatus(),
      this.orders.countViews(today),
      this.orders.outstanding(),
      this.orders.revenueByMonth(from),
    ]);
    // Every month of the window, including the empty ones, so a chart has no gaps.
    const revenueByMonth = Array.from({ length: months }, (_, index) => {
      const month = monthsBack(today, months - index);
      return revenue.find((entry) => entry.month === month) ?? { month, orders: 0, revenue: 0 };
    });
    return {
      byStatus: Object.fromEntries(
        SALES_ORDER_STATUSES.map((status) => [status, byStatus[status] ?? 0]),
      ) as SalesSummary["byStatus"],
      views,
      outstanding,
      revenueByMonth,
      generatedAt: now.toISOString(),
    };
  }

  // ------------------------------------------------------------------ helpers

  /** Manual and not deleted: what the full edit, quick status and delete accept. */
  private async editable(id: string) {
    const current = await this.get(id);
    if (current.deletedAt) throw new DomainError("common.not_found");
    if (current.source === "web") throw new DomainError("sales_order.web_order_locked");
    return current;
  }

  private async save(id: string, revision: number, changes: Partial<SalesOrderChanges>) {
    return this.unitOfWork.run(async (tx) => {
      const saved = await this.orders.update(id, revision, changes, tx);
      if (!saved) throw new DomainError("common.conflict");
      await this.sheet.queue(tx);
      return saved;
    });
  }

  private withAudit(
    action: ProgramAuditAction,
    id: string,
    revision: number,
    actor: SalesActor,
    now: Date,
    changes: Partial<SalesOrderChanges> & { deletedAt: Date | null },
  ) {
    return this.unitOfWork.run(async (tx) => {
      const saved = await this.orders.update(id, revision, changes, tx);
      if (!saved) throw new DomainError("common.conflict");
      await this.log(action, "sales_order", id, actor, now, tx, {});
      await this.sheet.queue(tx);
      return saved;
    });
  }

  private async changesOf(
    input: SalesOrderInput,
    author: StaffRef,
    now: Date,
  ): Promise<SalesOrderChanges> {
    assertDueDay(input.orderType, input.status, input.dueDay);
    await this.checkPriceItems(input.items.map((item) => item.priceItemId));
    const totals = computeTotals(input.items, input.shippingFee, input.discount);
    const phone = input.customer.phone.trim();
    return {
      orderType: input.orderType,
      customer: {
        name: input.customer.name,
        phone,
        phoneNormalized: phone ? normalizePhone(phone) : null,
        address: toAddress(input.customer.address),
      },
      channel: input.channel,
      items: input.items.map((item) => ({
        priceItemId: item.priceItemId,
        name: item.name,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
      })),
      ...totals,
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentStatus,
      status: input.status,
      orderDay: input.orderDay ?? vnDay(now),
      dueDay: input.dueDay,
      assignee: await this.assigneeOf(input.assigneeId),
      note: input.note,
      updatedBy: author,
    };
  }

  private async checkPriceItems(ids: (string | null)[]) {
    const wanted = [...new Set(ids.filter((id): id is string => id !== null))];
    if (wanted.length === 0) return;
    const found = await this.priceItems.findByIds(wanted);
    if (found.length !== wanted.length) throw new DomainError("sales_order.unknown_price_item");
  }

  private async assigneeOf(id: string | null): Promise<StaffRef | null> {
    if (id === null) return null;
    const staff = await this.staff.list();
    const found = staff.find((entry) => entry.id === id);
    if (!found) throw new DomainError("sales_order.unknown_assignee");
    return found;
  }

  /** Who did it, by name for the Sheet and the screens; never blocks on identity. */
  private async authorOf(actor: SalesActor): Promise<StaffRef> {
    try {
      const staff = await this.staff.list();
      return staff.find((entry) => entry.id === actor.userId) ?? { id: actor.userId, name: "" };
    } catch {
      return { id: actor.userId, name: "" };
    }
  }

  private log(
    action: ProgramAuditAction,
    type: string,
    id: string,
    actor: SalesActor,
    now: Date,
    tx: TxContext,
    meta: Record<string, string | number | boolean>,
  ) {
    return this.audit.record(
      tx,
      {
        action,
        actor: { userId: actor.userId, roles: actor.roles },
        target: { type, id },
        requestId: actor.requestId,
        meta,
      },
      now,
    );
  }
}

export type { SalesOrderRecord };
