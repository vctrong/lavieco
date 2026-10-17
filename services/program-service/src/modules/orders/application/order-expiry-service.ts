import type { UnitOfWork } from "@lavieco/service-kit/ports";

import type { CheckoutService } from "./checkout-service";
import type { OrderRepository } from "./ports/order-repositories.port";

const BATCH = 100;

/**
 * Ends holds older than 15 minutes (BR-14): `pending → expired`, seats back, payOS
 * link cancelled through the outbox. Each order changes in its own transaction with
 * a conditional update (still pending, still held, hold ended), so running on several
 * instances, or racing a webhook, can never release the same seats twice.
 */
export class OrderExpiryService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly checkout: CheckoutService,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async expireDue(now = new Date()): Promise<number> {
    const ids = await this.orders.listExpired(now, BATCH);
    let expired = 0;
    for (const id of ids) {
      const done = await this.unitOfWork.run(async (tx) => {
        const order = await this.orders.transition(
          id,
          { statuses: ["pending"], seatState: "held", expiresBefore: now },
          { status: "expired", seatState: "released", expiredAt: now },
          tx,
        );
        if (!order) return false;
        await this.checkout.releaseHeld(order, tx);
        return true;
      });
      if (done) expired += 1;
    }
    return expired;
  }
}
