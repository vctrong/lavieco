import { describe, expect, it, vi } from "vitest";

import type { PriceItemRepository, SalesOrderRepository } from "./ports";
import { SalesSheetSync } from "./sales-sheet-sync";

const orders = { listAllForExport: vi.fn(async () => []) } as unknown as SalesOrderRepository;
const items = { list: vi.fn(async () => []) } as unknown as PriceItemRepository;

describe("SalesSheetSync", () => {
  it("rewrites once for changes made before the last rewrite started", async () => {
    const writer = { write: vi.fn(async () => undefined) };
    const sync = new SalesSheetSync(orders, items, writer);
    expect(await sync.run(1_000, new Date(2_000))).toBe("written");
    expect(await sync.run(1_500, new Date(3_000))).toBe("skipped");
    expect(await sync.run(2_500, new Date(4_000))).toBe("written");
    expect(writer.write).toHaveBeenCalledTimes(2);
  });

  it("tries again after a failed rewrite", async () => {
    const writer = {
      write: vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValue(undefined),
    };
    const sync = new SalesSheetSync(orders, items, writer);
    await expect(sync.run(1_000, new Date(2_000))).rejects.toThrow("down");
    expect(await sync.run(1_000, new Date(3_000))).toBe("written");
  });
});
