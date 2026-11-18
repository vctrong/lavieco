"use server";

import { z } from "zod";

import {
  handbookImportCreateSchema,
  handbookPageUpdateSchema,
  handbookStructureUpdateSchema,
  handbookUploadCreateSchema,
  type HandbookImportJob,
  type HandbookOverview,
  type HandbookPublishResult,
  type HandbookUpload,
  type HandbookVersion,
} from "@lavieco/shared/content";

import { guarded } from "@/lib/action-errors";
import { contentClient, identityClient, programClient } from "@/lib/services";

import { callHandbook } from "../server/handbook";
import type { HandbookResult } from "../types";

const invalid = { status: "error", reason: "invalid" } as const;
const unavailable = () => ({ status: "error", reason: "unavailable" }) as const;

/** The publisher's name comes from identity, never from the browser (D1 alert, history). */
async function myName(token: string, requestId: string) {
  return (await identityClient().getStaffProfile(token, requestId)).displayName;
}

export async function reloadHandbook(): Promise<HandbookResult<HandbookOverview>> {
  return guarded(
    () => callHandbook("handbook.load", (token, id) => contentClient().getHandbook(token, id)),
    unavailable,
  );
}

export async function startDraft(): Promise<HandbookResult<HandbookVersion>> {
  return guarded(
    () =>
      callHandbook("handbook.draft", async (token, id) =>
        contentClient().startHandbookDraft(token, { actorName: await myName(token, id) }, id),
      ),
    unavailable,
  );
}

export async function saveStructure(input: unknown): Promise<HandbookResult<HandbookVersion>> {
  const parsed = handbookStructureUpdateSchema.safeParse(input);
  if (!parsed.success) return invalid;
  return guarded(
    () =>
      callHandbook("handbook.structure", (token, id) =>
        contentClient().updateHandbookStructure(token, parsed.data, id),
      ),
    unavailable,
  );
}

export async function savePage(
  pageId: unknown,
  input: unknown,
): Promise<HandbookResult<HandbookVersion>> {
  const id = z.uuid().safeParse(pageId);
  const parsed = handbookPageUpdateSchema.safeParse(input);
  if (!id.success || !parsed.success) return invalid;
  return guarded(
    () =>
      callHandbook("handbook.page", (token, requestId) =>
        contentClient().updateHandbookPage(token, id.data, parsed.data, requestId),
      ),
    unavailable,
  );
}

export async function discardDraft(revision: unknown): Promise<HandbookResult> {
  if (typeof revision !== "number") return invalid;
  return guarded(
    () =>
      callHandbook("handbook.discard", async (token, id) => {
        await contentClient().discardHandbookDraft(token, revision, id);
        return undefined;
      }),
    unavailable,
  );
}

const publishInput = z.object({
  revision: z.number().int().positive(),
  note: z.string().trim().min(3).max(300),
});

export async function publishDraft(input: unknown): Promise<HandbookResult<HandbookPublishResult>> {
  const parsed = publishInput.safeParse(input);
  if (!parsed.success) return invalid;
  return guarded(
    () =>
      callHandbook("handbook.publish", async (token, id) =>
        contentClient().publishHandbook(
          token,
          { ...parsed.data, actorName: await myName(token, id) },
          id,
        ),
      ),
    unavailable,
  );
}

const restoreInput = z.object({
  number: z.number().int().positive(),
  note: z.string().trim().min(3).max(300),
  discardDraft: z.boolean(),
});

export async function restoreVersion(
  input: unknown,
): Promise<HandbookResult<HandbookPublishResult>> {
  const parsed = restoreInput.safeParse(input);
  if (!parsed.success) return invalid;
  return guarded(
    () =>
      callHandbook("handbook.restore", async (token, id) =>
        contentClient().restoreHandbook(
          token,
          { ...parsed.data, actorName: await myName(token, id) },
          id,
        ),
      ),
    unavailable,
  );
}

export async function createUpload(input: unknown): Promise<HandbookResult<HandbookUpload>> {
  const parsed = handbookUploadCreateSchema.safeParse(input);
  if (!parsed.success) return invalid;
  return guarded(
    () =>
      callHandbook("handbook.upload", (token, id) =>
        contentClient().createHandbookUpload(token, parsed.data, id),
      ),
    unavailable,
  );
}

export async function createImport(input: unknown): Promise<HandbookResult<HandbookImportJob>> {
  const parsed = handbookImportCreateSchema.safeParse(input);
  if (!parsed.success) return invalid;
  return guarded(
    () =>
      callHandbook("handbook.import", (token, id) =>
        contentClient().createHandbookImport(token, parsed.data, id),
      ),
    unavailable,
  );
}

export async function getImport(jobId: unknown): Promise<HandbookResult<HandbookImportJob>> {
  const id = z
    .string()
    .regex(/^[0-9a-f]{24}$/)
    .safeParse(jobId);
  if (!id.success) return invalid;
  return guarded(
    () =>
      callHandbook("handbook.import.get", (token, requestId) =>
        contentClient().getHandbookImport(token, id.data, requestId),
      ),
    unavailable,
  );
}

export type ProductChoice = { id: string; slug: string; title: string };

/** Products to link a hotspot to (needs `product:read`, as content editors have). */
export async function searchProducts(query: unknown): Promise<HandbookResult<ProductChoice[]>> {
  const q = z.string().trim().max(100).safeParse(query);
  if (!q.success) return invalid;
  return guarded(
    () =>
      callHandbook("handbook.products", async (token, id) => {
        const page = await programClient().listProducts(
          token,
          { limit: 12, ...(q.data ? { q: q.data } : {}) },
          id,
        );
        return page.items.map((item) => ({ id: item.id, slug: item.slug, title: item.title }));
      }),
    unavailable,
  );
}
