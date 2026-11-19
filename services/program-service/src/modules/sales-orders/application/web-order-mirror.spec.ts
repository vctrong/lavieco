import { describe, expect, it, vi } from "vitest";

import type { TxContext } from "@lavieco/service-kit/ports";

import type { SalesOrderRepository } from "./ports";
import { SalesWebOrderMirror, mirrorFields, type MirrorableShopOrder } from "./web-order-mirror";

const order = (status: MirrorableShopOrder["status"]): MirrorableShopOrder => ({
  id: "6650a0000000000000000001",
  publicCode: "LVS-7K3Q9M",
  status,
  paymentMethod: "payos",
  paidAt: status === "paid" ? new Date("2026-11-20T02:00:00Z") : null,
  buyer: { fullName: "Khách Thử", phone: "0900000009" },
  shipping: {
    method: "delivery",
    address: {
      line: "1 Đường Mẫu",
      ward: "Phường Ninh Kiều",
      province: "Thành phố Cần Thơ",
      provinceCode: 92,
      wardCode: 31135,
    },
  },
  items: [{ title: "Phone charm", optionLabel: "Vỏ ốc", unitPrice: 45_000, quantity: 2 }],
  subtotal: 90_000,
  discount: { amount: 10_000 },
  shippingFee: 0,
  amount: 80_000,
  createdAt: new Date("2026-11-19T18:00:00Z"),
});

const tx = {} as TxContext;
const sheet = { queue: vi.fn(async () => undefined) };

function repo(existing: boolean) {
  return {
    newId: () => "6650a00000000000000000ff",
    findByShopOrderId: vi.fn(async () => (existing ? ({} as never) : null)),
    upsertMirror: vi.fn(async () => undefined),
  } as unknown as SalesOrderRepository & {
    upsertMirror: ReturnType<typeof vi.fn>;
  };
}

describe("web order mirror", () => {
  it("copies money, status and payment; codes stay LVS-…", async () => {
    const orders = repo(false);
    await new SalesWebOrderMirror(orders, sheet).sync(order("paid"), tx);
    const [shopOrderId, insert, mirrored] = orders.upsertMirror.mock.calls[0]!;
    expect(shopOrderId).toBe("6650a0000000000000000001");
    expect(insert).toMatchObject({ code: "LVS-7K3Q9M", source: "web", channel: "website" });
    expect(mirrored).toMatchObject({
      status: "new",
      paymentStatus: "paid",
      paymentMethod: "bank_transfer",
      subtotal: 90_000,
      discount: 10_000,
      total: 80_000,
      orderDay: "2026-11-20",
    });
    expect(mirrored).not.toHaveProperty("assignee");
    expect(mirrored).not.toHaveProperty("note");
  });

  it("ignores a payOS checkout nobody paid", async () => {
    const orders = repo(false);
    await new SalesWebOrderMirror(orders, sheet).sync(order("awaiting_payment"), tx);
    await new SalesWebOrderMirror(orders, sheet).sync(order("expired"), tx);
    expect(orders.upsertMirror).not.toHaveBeenCalled();
  });

  it("follows an order already in the book when it expires", async () => {
    const orders = repo(true);
    await new SalesWebOrderMirror(orders, sheet).sync(order("expired"), tx);
    expect(orders.upsertMirror.mock.calls[0]![2]).toMatchObject({ status: "cancelled" });
  });

  it("marks an order with a piece made on demand and gives it a first due day", async () => {
    const orders = repo(false);
    const made = order("paid");
    made.items = [{ ...made.items[0]!, madeToOrder: true, leadTimeDays: 5 }];
    await new SalesWebOrderMirror(orders, sheet).sync(made, tx);
    expect(orders.upsertMirror.mock.calls[0]![1]).toMatchObject({
      orderType: "made_to_order",
      dueDay: "2026-11-25",
    });
  });

  it("names a line with its option and keeps the address with its codes", () => {
    const fields = mirrorFields(order("packing"));
    expect(fields.items[0]!.name).toBe("Phone charm (Vỏ ốc)");
    expect(fields.customer.address).toMatchObject({
      wardCode: 31135,
      full: "1 Đường Mẫu, Phường Ninh Kiều, Thành phố Cần Thơ",
    });
    expect(fields.status).toBe("in_progress");
  });
});
