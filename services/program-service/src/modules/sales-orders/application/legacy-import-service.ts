import type { UnitOfWork } from "@lavieco/service-kit/ports";
import { normalizePhone } from "@lavieco/shared";
import { toSearchKey } from "@lavieco/shared";
import type { StaffRef } from "@lavieco/shared/sales";

import type { AuditTrail } from "../../audit";
import { assertDueDay } from "../domain/sales-order";
import { matchStaff, type LegacyPlan } from "./legacy-sheet";
import type { PriceItemRepository, SalesOrderRepository, StaffDirectory } from "./ports";
import type { SalesSheetQueue } from "./sales-jobs";

export type LegacyImportReport = {
  priceItemsCreated: number;
  priceItemsKept: number;
  ordersCreated: number;
  ordersKept: number;
  /** Sheet names with no single matching staff account (left unassigned). */
  unmatchedAssignees: string[];
  /** `LV-…` codes already used by another order: the import stops before writing. */
  codeClashes: string[];
};

/**
 * Writes a checked legacy plan (ADR-0030). Idempotent: price items match by name,
 * orders by `legacyCode`; running it again creates nothing. Codes come from the plan
 * (`LV-0001`… by order day) and the counter is raised past them.
 */
export class LegacyImportService {
  constructor(
    private readonly orders: SalesOrderRepository,
    private readonly priceItems: PriceItemRepository,
    private readonly staff: StaffDirectory,
    private readonly unitOfWork: UnitOfWork,
    private readonly audit: AuditTrail,
    private readonly sheet: SalesSheetQueue,
  ) {}

  /** What `apply` would do, without writing. */
  async preview(plan: LegacyPlan) {
    return this.run(plan, false);
  }

  apply(plan: LegacyPlan, actorUserId: string | null, now = new Date()) {
    return this.run(plan, true, actorUserId, now);
  }

  private async run(
    plan: LegacyPlan,
    write: boolean,
    actorUserId: string | null = null,
    now = new Date(),
  ): Promise<LegacyImportReport> {
    const staff = await this.staff.list();
    const report: LegacyImportReport = {
      priceItemsCreated: 0,
      priceItemsKept: 0,
      ordersCreated: 0,
      ordersKept: 0,
      unmatchedAssignees: [],
      codeClashes: [],
    };
    const assignees = new Map<string, StaffRef | null>();
    for (const order of plan.orders) {
      const label = order.assigneeName;
      if (!label || assignees.has(label)) continue;
      const found = matchStaff(label, staff);
      assignees.set(label, found);
      if (!found) report.unmatchedAssignees.push(label);
    }

    const pending: typeof plan.orders = [];
    for (const order of plan.orders) {
      if (await this.orders.findByLegacyCode(order.legacyCode)) {
        report.ordersKept += 1;
        continue;
      }
      const taken = await this.orders.findByCode(order.code);
      if (taken) report.codeClashes.push(`${order.code} (${order.legacyCode})`);
      pending.push(order);
    }
    if (report.codeClashes.length > 0 || plan.problems.length > 0) return report;

    const priceIds = new Map<string, string>();
    for (const item of plan.priceItems) {
      const existing = await this.priceItems.findByName(item.name);
      if (existing) {
        report.priceItemsKept += 1;
        priceIds.set(toSearchKey(item.name), existing.id);
        continue;
      }
      report.priceItemsCreated += 1;
      if (!write) continue;
      const saved = await this.priceItems.insert({
        id: this.priceItems.newId(),
        name: item.name,
        price: item.price,
        active: true,
        note: item.note,
        sortOrder: report.priceItemsCreated + report.priceItemsKept - 1,
      });
      priceIds.set(toSearchKey(item.name), saved.id);
    }

    report.ordersCreated = pending.length;
    if (!write || pending.length === 0) return report;

    await this.unitOfWork.run(async (tx) => {
      for (const order of pending) {
        assertDueDay(order.orderType, order.status, order.dueDay);
        const address = order.addressText
          ? {
              provinceCode: null,
              provinceName: "",
              wardCode: null,
              wardName: "",
              detail: order.addressText,
              full: order.addressText,
            }
          : null;
        await this.orders.insert(
          {
            id: this.orders.newId(),
            code: order.code,
            legacyCode: order.legacyCode,
            source: "manual",
            shopOrderId: null,
            orderType: order.orderType,
            customer: {
              name: order.customerName,
              phone: order.phone,
              phoneNormalized: order.phone ? normalizePhone(order.phone) : null,
              address,
            },
            channel: order.channel,
            items: order.lines.map((line) => ({
              priceItemId: priceIds.get(toSearchKey(line.name)) ?? null,
              name: line.name,
              unitPrice: line.unitPrice,
              quantity: line.quantity,
            })),
            subtotal: order.subtotal,
            shippingFee: order.shippingFee,
            discount: order.discount,
            total: order.total,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            status: order.status,
            orderDay: order.orderDay,
            dueDay: order.dueDay,
            assignee: assignees.get(order.assigneeName) ?? null,
            note: order.note,
            createdBy: null,
            updatedBy: null,
            deletedAt: null,
          },
          tx,
        );
      }
      const highest = Math.max(...plan.orders.map((order) => Number(order.code.slice(3))));
      await this.orders.raiseSeq(highest, tx);
      if (actorUserId)
        await this.audit.record(
          tx,
          {
            action: "sales_order.import",
            actor: { userId: actorUserId, roles: [] },
            target: { type: "sales_order", id: "legacy" },
            requestId: null,
            meta: { orders: pending.length },
          },
          now,
        );
      await this.sheet.queue(tx);
    });
    return report;
  }
}
