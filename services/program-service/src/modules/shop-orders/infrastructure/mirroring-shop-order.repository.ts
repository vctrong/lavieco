import { Inject, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import type { TxContext } from "@lavieco/service-kit/ports";
import type { ShopOrderStatus } from "@lavieco/shared/shop";

import { WEB_ORDER_MIRROR, type WebOrderMirror } from "../../sales-orders";
import type { ShopOrderRecord } from "../domain/shop-order";
import { MongoShopOrderRepository, SHOP_ORDER_MODEL } from "./shop-order.repository";

/**
 * The shop order repository, plus the order book: every insert and status change is
 * mirrored into `sales_orders` in the same transaction (ADR-0030), so the team's list
 * never misses a website order and never shows a state the shop did not commit.
 */
@Injectable()
export class MirroringShopOrderRepository extends MongoShopOrderRepository {
  constructor(
    @InjectModel(SHOP_ORDER_MODEL) model: ConstructorParameters<typeof MongoShopOrderRepository>[0],
    @Inject(WEB_ORDER_MIRROR) private readonly mirror: WebOrderMirror,
  ) {
    super(model);
  }

  override async insert(order: ShopOrderRecord, tx: TxContext) {
    await super.insert(order, tx);
    await this.mirror.sync(order, tx);
  }

  override async transition(
    id: string,
    from: readonly ShopOrderStatus[],
    set: Partial<Omit<ShopOrderRecord, "id">>,
    entry: { status: ShopOrderStatus; at: Date; actorId: string | null },
    tx: TxContext,
    revision?: number,
  ) {
    const saved = await super.transition(id, from, set, entry, tx, revision);
    if (saved) await this.mirror.sync(saved, tx);
    return saved;
  }
}
