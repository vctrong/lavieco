"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { objectIdSchema } from "@lavieco/shared";
import {
  priceItemCreateRequestSchema,
  priceItemUpdateRequestSchema,
  salesOrderBulkStatusRequestSchema,
  salesOrderInputSchema,
  salesOrderQuickUpdateRequestSchema,
  salesOrderTeamFieldsRequestSchema,
  salesOrderUpdateRequestSchema,
  salesPhoneSchema,
  type PriceItem,
  type SalesCustomer,
  type SalesOrder,
  type SalesOrderBulkResult,
} from "@lavieco/shared/sales";

import { guarded } from "@/lib/action-errors";
import { programClient } from "@/lib/services";

import { callSales } from "../server/sales";
import type { SalesActionResult } from "../types";

const invalid = { status: "error", reason: "invalid" } as const;
const unavailable = () => ({ status: "error", reason: "unavailable" }) as const;
const revisionSchema = z.number().int().min(1);

/** Every write refreshes the list, the detail and the summary. */
function done<T>(result: SalesActionResult<T>) {
  if (result.status === "ok") revalidatePath("/sales", "layout");
  return result;
}

export async function createSalesOrder(input: unknown): Promise<SalesActionResult<SalesOrder>> {
  return guarded(async () => {
    const body = salesOrderInputSchema.safeParse(input);
    if (!body.success) return invalid;
    return done(
      await callSales("sales.create", (token, rid) =>
        programClient().createSalesOrder(token, body.data, rid),
      ),
    );
  }, unavailable);
}

export async function updateSalesOrder(
  orderId: unknown,
  input: unknown,
): Promise<SalesActionResult<SalesOrder>> {
  return guarded(async () => {
    const id = objectIdSchema.safeParse(orderId);
    const body = salesOrderUpdateRequestSchema.safeParse(input);
    if (!id.success || !body.success) return invalid;
    return done(
      await callSales("sales.update", (token, rid) =>
        programClient().updateSalesOrder(token, id.data, body.data, rid),
      ),
    );
  }, unavailable);
}

export async function updateSalesOrderTeam(
  orderId: unknown,
  input: unknown,
): Promise<SalesActionResult<SalesOrder>> {
  return guarded(async () => {
    const id = objectIdSchema.safeParse(orderId);
    const body = salesOrderTeamFieldsRequestSchema.safeParse(input);
    if (!id.success || !body.success) return invalid;
    return done(
      await callSales("sales.team", (token, rid) =>
        programClient().updateSalesOrderTeam(token, id.data, body.data, rid),
      ),
    );
  }, unavailable);
}

export async function quickUpdateSalesOrder(
  orderId: unknown,
  input: unknown,
): Promise<SalesActionResult<SalesOrder>> {
  return guarded(async () => {
    const id = objectIdSchema.safeParse(orderId);
    const body = salesOrderQuickUpdateRequestSchema.safeParse(input);
    if (!id.success || !body.success) return invalid;
    return done(
      await callSales("sales.status", (token, rid) =>
        programClient().quickUpdateSalesOrder(token, id.data, body.data, rid),
      ),
    );
  }, unavailable);
}

export async function bulkSalesOrderStatus(
  input: unknown,
): Promise<SalesActionResult<SalesOrderBulkResult>> {
  return guarded(async () => {
    const body = salesOrderBulkStatusRequestSchema.safeParse(input);
    if (!body.success) return invalid;
    return done(
      await callSales("sales.bulk", (token, rid) =>
        programClient().bulkSalesOrderStatus(token, body.data, rid),
      ),
    );
  }, unavailable);
}

export async function deleteSalesOrder(
  orderId: unknown,
  revision: unknown,
): Promise<SalesActionResult<SalesOrder>> {
  return guarded(async () => {
    const id = objectIdSchema.safeParse(orderId);
    const rev = revisionSchema.safeParse(revision);
    if (!id.success || !rev.success) return invalid;
    return done(
      await callSales("sales.delete", (token, rid) =>
        programClient().deleteSalesOrder(token, id.data, rev.data, rid),
      ),
    );
  }, unavailable);
}

export async function restoreSalesOrder(
  orderId: unknown,
  revision: unknown,
): Promise<SalesActionResult<SalesOrder>> {
  return guarded(async () => {
    const id = objectIdSchema.safeParse(orderId);
    const rev = revisionSchema.safeParse(revision);
    if (!id.success || !rev.success) return invalid;
    return done(
      await callSales("sales.restore", (token, rid) =>
        programClient().restoreSalesOrder(token, id.data, rev.data, rid),
      ),
    );
  }, unavailable);
}

/** Prefill: last name and address known for this phone number. */
export async function lookupSalesCustomer(
  phone: unknown,
): Promise<SalesActionResult<SalesCustomer | null>> {
  return guarded(async () => {
    const value = salesPhoneSchema.safeParse(phone);
    if (!value.success || value.data.replace(/\D/g, "").length < 9) return invalid;
    const result = await callSales("sales.customer", (token, rid) =>
      programClient().lookupSalesCustomer(token, value.data, rid),
    );
    return result.status === "ok" ? { status: "ok", data: result.data.customer } : result;
  }, unavailable);
}

export async function createPriceItem(input: unknown): Promise<SalesActionResult<PriceItem>> {
  return guarded(async () => {
    const body = priceItemCreateRequestSchema.safeParse(input);
    if (!body.success) return invalid;
    return done(
      await callSales("sales.price.create", (token, rid) =>
        programClient().createPriceItem(token, body.data, rid),
      ),
    );
  }, unavailable);
}

export async function updatePriceItem(
  itemId: unknown,
  input: unknown,
): Promise<SalesActionResult<PriceItem>> {
  return guarded(async () => {
    const id = objectIdSchema.safeParse(itemId);
    const body = priceItemUpdateRequestSchema.safeParse(input);
    if (!id.success || !body.success) return invalid;
    return done(
      await callSales("sales.price.update", (token, rid) =>
        programClient().updatePriceItem(token, id.data, body.data, rid),
      ),
    );
  }, unavailable);
}
