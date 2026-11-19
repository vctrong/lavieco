import { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import {
  priceItemSchema,
  salesOrderListSchema,
  salesOrderSchema,
  salesSummarySchema,
} from "@lavieco/shared/sales";

import type { StaffDirectory } from "../../modules/sales-orders";
import { bearer, createTestApp, type TestApp } from "../support/test-app";

let t: TestApp;
const trongId = new Types.ObjectId().toHexString();
const quynhId = new Types.ObjectId().toHexString();
const staffDirectory: StaffDirectory = {
  list: async () => [
    { id: trongId, name: "Trọng" },
    { id: quynhId, name: "Quỳnh" },
  ],
};

beforeAll(async () => {
  t = await createTestApp(inject("mongoUri"), { staffDirectory });
});

afterAll(async () => {
  await t?.close();
});

const editor = async () => bearer(await t.staffToken(["coordinator"], trongId));
const auditor = async () => bearer(await t.staffToken(["auditor"]));

const ORDER = {
  orderType: "in_stock",
  customer: {
    name: "Chị Tiền",
    phone: "0333353292",
    address: { provinceCode: 92, wardCode: 31135, detail: "060 ấp Nhơn Bình" },
  },
  channel: "in_person",
  items: [
    { priceItemId: null, name: "Khay vỏ sò", unitPrice: 45_000, quantity: 2 },
    { priceItemId: null, name: "Khay 1kg bự", unitPrice: 140_000, quantity: 2 },
  ],
  shippingFee: 0,
  discount: 160_000,
  paymentMethod: "bank_transfer",
  paymentStatus: "paid",
  status: "completed",
  orderDay: "2026-10-07",
  dueDay: "2026-10-15",
  assigneeId: trongId,
  note: "Giảm 80k/khay 1kg bự",
};

async function create(body: Record<string, unknown> = {}) {
  const res = await t
    .http()
    .post("/internal/v1/sales/orders")
    .set("authorization", await editor())
    .send({ ...ORDER, ...body })
    .expect(201);
  return salesOrderSchema.parse(res.body);
}

describe("creating an order", () => {
  it("numbers it LV-…, computes the totals and snapshots names", async () => {
    const order = await create({ subtotal: 1, total: 1 });
    expect(order.code).toMatch(/^LV-\d{4,}$/);
    expect(order).toMatchObject({
      source: "manual",
      subtotal: 370_000,
      discount: 160_000,
      total: 210_000,
      assignee: { id: trongId, name: "Trọng" },
      createdBy: { id: trongId, name: "Trọng" },
    });
    expect(order.customer.phone).toBe("0333353292");
    expect(order.customer.address?.full).toBe(
      "060 ấp Nhơn Bình, Phường Ninh Kiều, Thành phố Cần Thơ",
    );
  });

  it("gives consecutive codes", async () => {
    const a = await create();
    const b = await create();
    const n = (code: string) => Number(code.slice(3));
    expect(n(b.code)).toBe(n(a.code) + 1);
  });

  it("keeps 'Khác' addresses as the free line only", async () => {
    const order = await create({
      customer: {
        name: "Gia Bảo",
        phone: "",
        address: { provinceCode: null, wardCode: null, detail: "Trường (3h chiều)" },
      },
    });
    expect(order.customer.address).toMatchObject({ provinceName: "", full: "Trường (3h chiều)" });
  });

  it("requires a due day for made-to-order", async () => {
    const res = await t
      .http()
      .post("/internal/v1/sales/orders")
      .set("authorization", await editor())
      .send({ ...ORDER, orderType: "made_to_order", status: "new", dueDay: null })
      .expect(422);
    expect(res.body.type).toContain("sales_order.due_day_required");
  });

  it("rejects an unknown assignee", async () => {
    await t
      .http()
      .post("/internal/v1/sales/orders")
      .set("authorization", await editor())
      .send({ ...ORDER, assigneeId: new Types.ObjectId().toHexString() })
      .expect(422);
  });

  it("is refused without sales:write", async () => {
    await t
      .http()
      .post("/internal/v1/sales/orders")
      .set("authorization", await auditor())
      .send(ORDER)
      .expect(403);
  });
});

describe("editing", () => {
  it("rejects a stale revision with 409", async () => {
    const order = await create();
    const url = `/internal/v1/sales/orders/${order.id}/status`;
    await t
      .http()
      .patch(url)
      .set("authorization", await editor())
      .send({ revision: order.revision, status: "shipping" })
      .expect(200);
    await t
      .http()
      .patch(url)
      .set("authorization", await editor())
      .send({ revision: order.revision, status: "completed" })
      .expect(409);
  });

  it("soft deletes, hides and restores", async () => {
    const order = await create({ customer: { ...ORDER.customer, name: "Khách Xoá Thử" } });
    const del = await t
      .http()
      .post(`/internal/v1/sales/orders/${order.id}/delete`)
      .set("authorization", await editor())
      .send({ revision: order.revision })
      .expect(200);
    const hidden = await t
      .http()
      .get("/internal/v1/sales/orders?q=khach xoa thu")
      .set("authorization", await editor())
      .expect(200);
    expect(salesOrderListSchema.parse(hidden.body).items).toHaveLength(0);
    const deleted = await t
      .http()
      .get("/internal/v1/sales/orders?q=khach xoa thu&deleted=true")
      .set("authorization", await editor())
      .expect(200);
    expect(salesOrderListSchema.parse(deleted.body).items).toHaveLength(1);
    await t
      .http()
      .post(`/internal/v1/sales/orders/${order.id}/restore`)
      .set("authorization", await editor())
      .send({ revision: del.body.revision })
      .expect(200);
    expect(
      await t.db
        .collection("sales_orders")
        .countDocuments({ _id: new Types.ObjectId(order.id), deletedAt: null }),
    ).toBe(1);
  });

  it("changes several statuses at once", async () => {
    const a = await create({ status: "new" });
    const b = await create({ status: "new" });
    const res = await t
      .http()
      .post("/internal/v1/sales/orders/bulk-status")
      .set("authorization", await editor())
      .send({ ids: [a.id, b.id, new Types.ObjectId().toHexString()], status: "in_progress" })
      .expect(200);
    expect(res.body).toEqual({ updated: 2, skipped: 1 });
  });
});

describe("finding orders", () => {
  it("searches by name without accents, phone and code", async () => {
    const order = await create({
      customer: { ...ORDER.customer, name: "Ngô Phúc Tài", phone: "0946837057" },
    });
    for (const q of ["ngo phuc", "0946837057", order.code]) {
      const res = await t
        .http()
        .get(`/internal/v1/sales/orders?q=${encodeURIComponent(q)}`)
        .set("authorization", await auditor())
        .expect(200);
      expect(salesOrderListSchema.parse(res.body).items.map((o) => o.id)).toContain(order.id);
    }
  });

  it("lists overdue orders and marks their due state", async () => {
    const late = await create({ status: "in_progress", dueDay: "2020-01-01" });
    const res = await t
      .http()
      .get("/internal/v1/sales/orders?view=overdue&limit=100")
      .set("authorization", await editor())
      .expect(200);
    const found = salesOrderListSchema.parse(res.body).items.find((o) => o.id === late.id);
    expect(found?.dueState).toBe("overdue");
  });

  it("prefills a returning customer by phone", async () => {
    await create({ customer: { ...ORDER.customer, name: "Paul Trieu", phone: "0926 360 993" } });
    const res = await t
      .http()
      .get("/internal/v1/sales/customers?phone=0926360993")
      .set("authorization", await editor())
      .expect(200);
    expect(res.body.customer).toMatchObject({ name: "Paul Trieu" });
  });

  it("summarises without counting cancelled orders as revenue", async () => {
    const before = salesSummarySchema.parse(
      (
        await t
          .http()
          .get("/internal/v1/sales/summary?period=all")
          .set("authorization", await editor())
          .expect(200)
      ).body,
    );
    await create({ status: "cancelled", orderDay: "2026-10-02" });
    const after = salesSummarySchema.parse(
      (
        await t
          .http()
          .get("/internal/v1/sales/summary?period=all")
          .set("authorization", await editor())
          .expect(200)
      ).body,
    );
    const october = (s: typeof after) =>
      s.revenueByMonth.find((m) => m.month === "2026-10")?.revenue;
    expect(october(after)).toBe(october(before));
    expect(after.byStatus.cancelled).toBe(before.byStatus.cancelled + 1);
  });
});

describe("summary by period", () => {
  it("counts only the orders of the period, today's views whatever the period", async () => {
    const get = async (period: string) =>
      salesSummarySchema.parse(
        (
          await t
            .http()
            .get(`/internal/v1/sales/summary?period=${period}`)
            .set("authorization", await editor())
            .expect(200)
        ).body,
      );
    const beforeAll = await get("all");
    const beforeMonth = await get("1");
    await create({ orderDay: "2024-03-01", status: "completed", discount: 0 });
    const afterAll = await get("all");
    const afterMonth = await get("1");
    expect(afterAll.totals.orders).toBe(beforeAll.totals.orders + 1);
    expect(afterAll.totals.revenue).toBe(beforeAll.totals.revenue + 370_000);
    expect(afterMonth.totals).toEqual(beforeMonth.totals);
    expect(afterMonth.period.from).toMatch(/^\d{4}-\d{2}-01$/);
    expect(afterMonth.revenueByMonth).toHaveLength(1);
    expect(afterAll.period.from).toBeNull();
    expect(afterAll.revenueByMonth.map((m) => m.month)).toContain("2024-03");
    expect(afterMonth.views).toEqual(afterAll.views);
  });
});

describe("price list", () => {
  it("adds and edits inline without touching existing orders", async () => {
    const created = priceItemSchema.parse(
      (
        await t
          .http()
          .post("/internal/v1/sales/price-items")
          .set("authorization", await editor())
          .send({ name: "Phone charm", price: 30_000 })
          .expect(201)
      ).body,
    );
    const order = await create({
      items: [{ priceItemId: created.id, name: "Phone charm", unitPrice: 30_000, quantity: 2 }],
      discount: 0,
    });
    await t
      .http()
      .patch(`/internal/v1/sales/price-items/${created.id}`)
      .set("authorization", await editor())
      .send({ revision: created.revision, price: 35_000, active: false })
      .expect(200);
    const again = await t
      .http()
      .get(`/internal/v1/sales/orders/${order.id}`)
      .set("authorization", await editor())
      .expect(200);
    expect(salesOrderSchema.parse(again.body).items[0]).toMatchObject({
      unitPrice: 30_000,
      lineTotal: 60_000,
    });
  });
});
