import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { createLogger } from "@lavieco/observability";
import { UNIT_OF_WORK } from "@lavieco/service-kit";
import type { UnitOfWork } from "@lavieco/service-kit/ports";

import { AppModule } from "../app.module";
import { loadProgramEnv } from "../config/env";
import { WEB_ORDER_MIRROR, type WebOrderMirror } from "../modules/sales-orders";
import { SHOP_ORDER_REPOSITORY, type ShopOrderRepository } from "../modules/shop-orders";

/**
 * `npm run sales:mirror-web` (ADR-0030): copies the website orders placed before the order
 * book existed. New orders are mirrored as they are saved; running this again only
 * refreshes the copies (assignee, due day and note are kept). Prints counts only.
 */
async function main() {
  const env = loadProgramEnv();
  const logger = createLogger({ service: "program-service", level: "warn" });
  const app = await NestFactory.createApplicationContext(
    AppModule.forRoot(env, { logger, runOrderExpiry: false, runCampaignWorker: false }),
    { logger: false },
  );
  try {
    const orders = app.get<ShopOrderRepository>(SHOP_ORDER_REPOSITORY);
    const mirror = app.get<WebOrderMirror>(WEB_ORDER_MIRROR);
    const unitOfWork = app.get<UnitOfWork>(UNIT_OF_WORK);
    const all = await orders.listForExport(new Date(0), new Date());
    for (const order of all) await unitOfWork.run((tx) => mirror.sync(order, tx));
    console.log(`Đã đồng bộ ${all.length} đơn website vào sổ đơn hàng.`);
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "mirror failed");
    process.exitCode = 1;
  });
}
