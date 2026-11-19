import type { TxContext, UnitOfWork } from "@lavieco/service-kit/ports";
import { DomainError } from "@lavieco/shared";
import {
  SALES_LIMITS,
  type PriceItemCreateRequest,
  type PriceItemUpdateRequest,
} from "@lavieco/shared/sales";

import type { AuditTrail } from "../../audit";
import type { PriceItemRepository } from "./ports";
import type { SalesActor } from "./sales-order-service";
import type { SalesSheetQueue } from "./sales-jobs";

/**
 * "Danh mục đơn giá" (ADR-0030): a plain list of pieces and prices for manual orders.
 * Changing a price never touches existing orders: their lines keep the price they were
 * sold at. Entries are switched off, never deleted, so old lines keep their reference.
 */
export class PriceListService {
  constructor(
    private readonly items: PriceItemRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly audit: AuditTrail,
    private readonly sheet: SalesSheetQueue,
  ) {}

  list() {
    return this.items.list();
  }

  async create(input: PriceItemCreateRequest, actor: SalesActor, now = new Date()) {
    const existing = await this.items.list();
    if (existing.length >= SALES_LIMITS.priceItemsMax)
      throw new DomainError("common.validation_failed");
    const id = this.items.newId();
    return this.inTx("sales_price.create", id, actor, now, (tx) =>
      this.items.insert(
        {
          id,
          name: input.name,
          price: input.price,
          active: input.active,
          note: input.note,
          sortOrder: existing.length,
        },
        tx,
      ),
    );
  }

  async update(id: string, input: PriceItemUpdateRequest, actor: SalesActor, now = new Date()) {
    const current = await this.items.findById(id);
    if (!current) throw new DomainError("common.not_found");
    const { revision, ...changes } = input;
    return this.inTx("sales_price.update", id, actor, now, async (tx) => {
      const saved = await this.items.update(id, revision, changes, tx);
      if (!saved) throw new DomainError("common.conflict");
      return saved;
    });
  }

  private inTx<T>(
    action: "sales_price.create" | "sales_price.update",
    id: string,
    actor: SalesActor,
    now: Date,
    write: (tx: TxContext) => Promise<T>,
  ) {
    return this.unitOfWork.run(async (tx: TxContext) => {
      const saved = await write(tx);
      await this.audit.record(
        tx,
        {
          action,
          actor: { userId: actor.userId, roles: actor.roles },
          target: { type: "sales_price_item", id },
          requestId: actor.requestId,
          meta: {},
        },
        now,
      );
      await this.sheet.queue(tx);
      return saved;
    });
  }
}
