"use server";

import { objectIdSchema } from "@lavieco/shared";
import {
  importImagesRequestSchema,
  importRemovedImagesRequestSchema,
  importRowUpdateRequestSchema,
  type ImportJob,
} from "@lavieco/shared/shop";

import { programClient } from "@/lib/services";

import { callShop } from "../server/shop";
import type { ShopActionResult } from "../types";

const invalid = { status: "error", reason: "invalid" } as const;
const rowNumber = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;

export async function getImportJob(jobId: unknown): Promise<ShopActionResult<ImportJob>> {
  const id = objectIdSchema.safeParse(jobId);
  if (!id.success) return invalid;
  return callShop("shop.import.get", (token, rid) =>
    programClient().getImportJob(token, id.data, rid),
  );
}

export async function updateImportRow(
  jobId: unknown,
  row: unknown,
  raw: unknown,
): Promise<ShopActionResult<ImportJob>> {
  const id = objectIdSchema.safeParse(jobId);
  const n = rowNumber(row);
  const body = importRowUpdateRequestSchema.safeParse({ raw });
  if (!id.success || n === null || !body.success) return invalid;
  return callShop("shop.import.row", (token, rid) =>
    programClient().updateImportRow(token, id.data, n, body.data.raw, rid),
  );
}

export async function skipImportRow(
  jobId: unknown,
  row: unknown,
  skipped: unknown,
): Promise<ShopActionResult<ImportJob>> {
  const id = objectIdSchema.safeParse(jobId);
  const n = rowNumber(row);
  if (!id.success || n === null || typeof skipped !== "boolean") return invalid;
  return callShop("shop.import.skip", (token, rid) =>
    programClient().skipImportRow(token, id.data, n, skipped, rid),
  );
}

export async function addImportImages(
  jobId: unknown,
  input: unknown,
): Promise<ShopActionResult<ImportJob>> {
  const id = objectIdSchema.safeParse(jobId);
  const body = importImagesRequestSchema.safeParse(input);
  if (!id.success || !body.success) return invalid;
  return callShop("shop.import.images", (token, rid) =>
    programClient().addImportImages(token, id.data, body.data, rid),
  );
}

export async function setImportRemovedImages(
  jobId: unknown,
  input: unknown,
): Promise<ShopActionResult<ImportJob>> {
  const id = objectIdSchema.safeParse(jobId);
  const body = importRemovedImagesRequestSchema.safeParse(input);
  if (!id.success || !body.success) return invalid;
  return callShop("shop.import.removed", (token, rid) =>
    programClient().setImportRemovedImages(token, id.data, body.data, rid),
  );
}

export async function commitImport(jobId: unknown): Promise<ShopActionResult<ImportJob>> {
  const id = objectIdSchema.safeParse(jobId);
  if (!id.success) return invalid;
  return callShop("shop.import.commit", (token, rid) =>
    programClient().commitImport(token, id.data, rid),
  );
}

export async function cancelImport(jobId: unknown): Promise<ShopActionResult<ImportJob>> {
  const id = objectIdSchema.safeParse(jobId);
  if (!id.success) return invalid;
  return callShop("shop.import.cancel", (token, rid) =>
    programClient().cancelImport(token, id.data, rid),
  );
}
