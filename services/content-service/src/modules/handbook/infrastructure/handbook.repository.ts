import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type Model, Types, mongo } from "mongoose";

import { sessionOf } from "@lavieco/service-kit";
import type { TxContext } from "@lavieco/service-kit/ports";
import { DomainError } from "@lavieco/shared";
import type {
  HandbookAccessLevel,
  HandbookActor,
  HandbookHotspot,
  HandbookVersionStatus,
} from "@lavieco/shared/content";

import type {
  HandbookPointers,
  HandbookRepository,
  NewVersion,
} from "../application/ports/handbook-repository.port";
import type {
  ChapterRecord,
  HandbookRecord,
  PageRecord,
  VersionContent,
  VersionRecord,
} from "../domain/handbook";
import { HANDBOOK_MODEL, HANDBOOK_VERSION_MODEL } from "./handbook.models";

type HandbookDoc = {
  _id: Types.ObjectId;
  slug: string;
  accessLevel: HandbookAccessLevel;
  publishedVersionId: Types.ObjectId | null;
  draftVersionId: Types.ObjectId | null;
  lastNumber: number;
  revision: number;
};

type VersionDoc = {
  _id: Types.ObjectId;
  handbookId: Types.ObjectId;
  number: number;
  status: HandbookVersionStatus;
  title: string;
  description: string;
  note: string;
  basedOnNumber: number | null;
  revision: number;
  chapters: ChapterRecord[];
  pages: (Omit<PageRecord, "hotspots"> & { hotspots: unknown[] })[];
  createdBy: HandbookActor;
  publishedBy: HandbookActor | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const oid = (id: string) => new Types.ObjectId(id);
const hex = (id: Types.ObjectId | null) => (id ? id.toHexString() : null);

function toHandbook(doc: HandbookDoc): HandbookRecord {
  return {
    id: doc._id.toHexString(),
    slug: doc.slug,
    accessLevel: doc.accessLevel ?? "free",
    publishedVersionId: hex(doc.publishedVersionId ?? null),
    draftVersionId: hex(doc.draftVersionId ?? null),
    lastNumber: doc.lastNumber ?? 0,
    revision: doc.revision,
  };
}

const actor = (value: HandbookActor | null | undefined): HandbookActor | null =>
  value ? { userId: value.userId, name: value.name ?? "" } : null;

function toVersion(doc: VersionDoc): VersionRecord {
  return {
    id: doc._id.toHexString(),
    handbookId: doc.handbookId.toHexString(),
    number: doc.number,
    status: doc.status,
    title: doc.title,
    description: doc.description ?? "",
    note: doc.note ?? "",
    basedOnNumber: doc.basedOnNumber ?? null,
    revision: doc.revision,
    chapters: (doc.chapters ?? []).map((chapter) => ({
      id: chapter.id,
      slug: chapter.slug,
      title: chapter.title,
      tint: chapter.tint,
    })),
    pages: (doc.pages ?? []).map((page) => ({
      id: page.id,
      key: page.key,
      chapterId: page.chapterId,
      title: page.title,
      alt: page.alt ?? "",
      image: {
        mediaId: page.image.mediaId,
        publicId: page.image.publicId,
        width: page.image.width,
        height: page.image.height,
      },
      text: page.text ?? "",
      textSource: page.textSource,
      // Written only after Zod validation (handbookHotspotSchema).
      hotspots: (page.hotspots ?? []) as HandbookHotspot[],
    })),
    createdBy: actor(doc.createdBy) ?? { userId: "", name: "" },
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    publishedBy: actor(doc.publishedBy),
    publishedAt: doc.publishedAt ?? null,
  };
}

const contentFields = (content: VersionContent) => ({
  title: content.title,
  description: content.description,
  chapters: content.chapters,
  pages: content.pages,
});

@Injectable()
export class MongoHandbookRepository implements HandbookRepository {
  constructor(
    @InjectModel(HANDBOOK_MODEL) private readonly handbooks: Model<HandbookDoc>,
    @InjectModel(HANDBOOK_VERSION_MODEL) private readonly versions: Model<VersionDoc>,
  ) {}

  async ensure(slug: string) {
    try {
      const doc = await this.handbooks
        .findOneAndUpdate(
          { slug },
          {
            $setOnInsert: {
              slug,
              schemaVersion: 1,
              accessLevel: "free",
              lastNumber: 0,
              revision: 1,
            },
          },
          { upsert: true, new: true },
        )
        .lean<HandbookDoc>()
        .exec();
      return toHandbook(doc!);
    } catch (error) {
      // Two first visits at once: the unique slug index lets one insert win.
      if (error instanceof mongo.MongoServerError && error.code === 11000) {
        const doc = await this.handbooks.findOne({ slug }).lean<HandbookDoc>().exec();
        if (doc) return toHandbook(doc);
      }
      throw error;
    }
  }

  async findBySlug(slug: string, tx?: TxContext) {
    const doc = await this.handbooks
      .findOne({ slug })
      .session(sessionOf(tx) ?? null)
      .lean<HandbookDoc>()
      .exec();
    return doc ? toHandbook(doc) : null;
  }

  async setPointers(id: string, revision: number, pointers: HandbookPointers, tx: TxContext) {
    const result = await this.handbooks
      .updateOne(
        { _id: oid(id), revision },
        {
          $set: {
            publishedVersionId: pointers.publishedVersionId
              ? oid(pointers.publishedVersionId)
              : null,
            draftVersionId: pointers.draftVersionId ? oid(pointers.draftVersionId) : null,
            lastNumber: pointers.lastNumber,
          },
          $inc: { revision: 1 },
        },
        { session: sessionOf(tx) },
      )
      .exec();
    return result.modifiedCount === 1;
  }

  async findVersion(id: string, tx?: TxContext) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.versions
      .findById(id)
      .session(sessionOf(tx) ?? null)
      .lean<VersionDoc>()
      .exec();
    return doc ? toVersion(doc) : null;
  }

  async findVersionByNumber(handbookId: string, number: number, tx?: TxContext) {
    const doc = await this.versions
      .findOne({ handbookId: oid(handbookId), number })
      .session(sessionOf(tx) ?? null)
      .lean<VersionDoc>()
      .exec();
    return doc ? toVersion(doc) : null;
  }

  async listVersions(handbookId: string) {
    const docs = await this.versions
      .find({ handbookId: oid(handbookId) }, { "pages.text": 0, "pages.hotspots": 0 })
      .sort({ number: -1 })
      .lean<VersionDoc[]>()
      .exec();
    return docs.map(toVersion);
  }

  async insertVersion(version: NewVersion, tx: TxContext) {
    try {
      const [doc] = await this.versions.create(
        [
          {
            schemaVersion: 1,
            handbookId: oid(version.handbookId),
            number: version.number,
            status: version.status,
            note: version.note,
            basedOnNumber: version.basedOnNumber,
            revision: 1,
            ...contentFields(version),
            createdBy: version.createdBy,
            publishedBy: version.publishedBy,
            publishedAt: version.publishedAt,
          },
        ],
        { session: sessionOf(tx) },
      );
      return toVersion(doc!.toObject<VersionDoc>());
    } catch (error) {
      // A second draft, or the same number twice: someone else got there first.
      if (error instanceof mongo.MongoServerError && error.code === 11000) {
        throw new DomainError("handbook.draft_exists");
      }
      throw error;
    }
  }

  async updateDraft(id: string, revision: number, content: VersionContent, tx?: TxContext) {
    const doc = await this.versions
      .findOneAndUpdate(
        { _id: oid(id), status: "draft", revision },
        { $set: contentFields(content), $inc: { revision: 1 } },
        { new: true, session: sessionOf(tx) },
      )
      .lean<VersionDoc>()
      .exec();
    return doc ? toVersion(doc) : null;
  }

  async markPublished(
    id: string,
    revision: number,
    publication: { note: string; publishedBy: HandbookActor; publishedAt: Date },
    tx: TxContext,
  ) {
    const doc = await this.versions
      .findOneAndUpdate(
        { _id: oid(id), status: "draft", revision },
        { $set: { status: "published", ...publication }, $inc: { revision: 1 } },
        { new: true, session: sessionOf(tx) },
      )
      .lean<VersionDoc>()
      .exec();
    return doc ? toVersion(doc) : null;
  }

  async markArchived(id: string, tx: TxContext) {
    await this.versions
      .updateOne(
        { _id: oid(id), status: { $in: ["draft", "published"] } },
        { $set: { status: "archived" }, $inc: { revision: 1 } },
        { session: sessionOf(tx) },
      )
      .exec();
  }
}
