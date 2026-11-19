import "reflect-metadata";

import { readFileSync } from "node:fs";

import { NestFactory } from "@nestjs/core";
import { z } from "zod";

import { createLogger } from "@lavieco/observability";

import { AppModule } from "../app.module";
import { loadProgramEnv } from "../config/env";
import {
  LEGACY_IMPORT_SERVICE,
  planLegacyImport,
  type LegacyImportService,
} from "../modules/sales-orders";

/**
 * `npm run sales:import-legacy -- <tabs.json> [--apply]` (ADR-0030, docs/09 §6).
 * Imports the old order sheet: the JSON holds the raw values of the tabs `DonHang`,
 * `ChiTiet` and `DonGia` (never `sheet1`), header row included. Without `--apply` it
 * only prints the plan and the checks. Safe to run again: nothing is created twice.
 * Prints codes, counts and staff names only, never customer data.
 */
const tabsSchema = z.object({
  donHang: z.array(z.array(z.string())),
  chiTiet: z.array(z.array(z.string())),
  donGia: z.array(z.array(z.string())),
});

/** What the sheet totals must add up to (agreed with the team, 17 orders). */
const DEFAULT_EXPECTED_TOTAL = 1_000_000;

async function main() {
  const file = process.argv[2];
  const apply = process.argv.includes("--apply");
  // Orders already imported: only fill the assignees still empty (accounts created later).
  const reassign = process.argv.includes("--reassign");
  const expectedArg = process.argv.find((arg) => arg.startsWith("--expected="));
  const EXPECTED_TOTAL = expectedArg ? Number(expectedArg.slice(11)) : DEFAULT_EXPECTED_TOTAL;
  if (!file || file.startsWith("--")) {
    console.error(
      "Usage: npm run sales:import-legacy -- <tabs.json> [--apply] [--reassign] [--expected=1000000]",
    );
    process.exitCode = 1;
    return;
  }
  const plan = planLegacyImport(tabsSchema.parse(JSON.parse(readFileSync(file, "utf8"))));

  console.log(`Đơn: ${plan.orders.length} · Món trong danh mục: ${plan.priceItems.length}`);
  console.log(`Tổng tiền các đơn: ${plan.sumTotal.toLocaleString("vi-VN")}đ`);
  for (const order of plan.orders)
    console.log(
      `  ${order.code} ← ${order.legacyCode}  ${order.orderType}  ${order.status}  ${order.total.toLocaleString("vi-VN")}đ`,
    );
  for (const note of plan.notes) console.log(`  · ${note}`);
  if (plan.sumTotal !== EXPECTED_TOTAL)
    plan.problems.push(
      `Tổng ${plan.sumTotal} khác ${EXPECTED_TOTAL} (thêm --expected=<số> nếu đúng)`,
    );
  for (const problem of plan.problems) console.error(`  ✗ ${problem}`);

  const env = loadProgramEnv();
  const logger = createLogger({ service: "program-service", level: "warn" });
  const app = await NestFactory.createApplicationContext(
    AppModule.forRoot(env, { logger, runOrderExpiry: false, runCampaignWorker: false }),
    { logger: false },
  );
  try {
    const importer = app.get<LegacyImportService>(LEGACY_IMPORT_SERVICE);
    if (reassign) {
      const result = await importer.reassign(plan, apply);
      console.log(
        apply ? "Đã gán người phụ trách:" : "Chạy thử gán người phụ trách (thêm --apply để ghi):",
      );
      console.log(`  đơn được điền người phụ trách: ${result.filled}`);
      if (result.unmatched.length)
        console.log(`  ⚠ Vẫn chưa có tài khoản khớp: ${result.unmatched.join(", ")}`);
      return;
    }
    const report = apply ? await importer.apply(plan, null) : await importer.preview(plan);
    console.log(apply ? "Đã ghi:" : "Chạy thử (thêm --apply để ghi):");
    console.log(
      `  đơn mới ${report.ordersCreated}, đã có ${report.ordersKept}; món mới ${report.priceItemsCreated}, đã có ${report.priceItemsKept}`,
    );
    if (report.unmatchedAssignees.length)
      console.log(`  ⚠ Không khớp tài khoản (để trống): ${report.unmatchedAssignees.join(", ")}`);
    if (report.codeClashes.length)
      console.error(`  ✗ Mã đã bị đơn khác dùng: ${report.codeClashes.join(", ")}`);
    if (plan.problems.length || report.codeClashes.length) process.exitCode = 1;
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "import failed");
    process.exitCode = 1;
  });
}
