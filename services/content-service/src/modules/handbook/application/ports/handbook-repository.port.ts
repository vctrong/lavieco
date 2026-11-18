import type { TxContext } from "@lavieco/service-kit/ports";
import type { HandbookActor } from "@lavieco/shared/content";

import type { HandbookRecord, VersionContent, VersionRecord } from "../../domain/handbook";

export const HANDBOOK_REPOSITORY = Symbol("HANDBOOK_REPOSITORY");

export type NewVersion = VersionContent & {
  handbookId: string;
  number: number;
  status: "draft" | "published";
  note: string;
  basedOnNumber: number | null;
  createdBy: HandbookActor;
  publishedBy: HandbookActor | null;
  publishedAt: Date | null;
};

export type HandbookPointers = {
  publishedVersionId: string | null;
  draftVersionId: string | null;
  lastNumber: number;
};

/** `handbooks` + `handbook_versions` (docs/03 §5.1, ADR-0029). Plain records out (S1). */
export interface HandbookRepository {
  /** The handbook with this slug, created empty the first time (phase 1 has one). */
  ensure(slug: string): Promise<HandbookRecord>;
  findBySlug(slug: string, tx?: TxContext): Promise<HandbookRecord | null>;
  /** Moves the version pointers; false when `revision` is no longer current. */
  setPointers(
    id: string,
    revision: number,
    pointers: HandbookPointers,
    tx: TxContext,
  ): Promise<boolean>;

  findVersion(id: string, tx?: TxContext): Promise<VersionRecord | null>;
  findVersionByNumber(
    handbookId: string,
    number: number,
    tx?: TxContext,
  ): Promise<VersionRecord | null>;
  /** Every version of the handbook, newest first, without page text. */
  listVersions(handbookId: string): Promise<VersionRecord[]>;
  insertVersion(version: NewVersion, tx: TxContext): Promise<VersionRecord>;
  /** Replaces a draft's content; null when it is not a draft any more or the revision moved. */
  updateDraft(
    id: string,
    revision: number,
    content: VersionContent,
    tx?: TxContext,
  ): Promise<VersionRecord | null>;
  /** draft → published; null when the revision moved. */
  markPublished(
    id: string,
    revision: number,
    publication: { note: string; publishedBy: HandbookActor; publishedAt: Date },
    tx: TxContext,
  ): Promise<VersionRecord | null>;
  /** published or draft → archived (a draft archived without being published was discarded). */
  markArchived(id: string, tx: TxContext): Promise<void>;
}
