import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type Model, Types } from "mongoose";

import { sessionOf } from "@lavieco/service-kit";
import type { TxContext } from "@lavieco/service-kit/ports";
import type {
  HandbookImportMode,
  HandbookImportStatus,
  HandbookUploadKind,
} from "@lavieco/shared/content";

import type {
  ImportError,
  ImportJobRecord,
  ImportJobRepository,
  ImportWarning,
  UploadRecord,
  UploadRepository,
} from "../application/ports/import-ports";
import type { HandbookPreviewTokenRepository } from "../application/ports/preview-token-repository.port";
import {
  HANDBOOK_IMPORT_JOB_MODEL,
  HANDBOOK_PREVIEW_TOKEN_MODEL,
  HANDBOOK_UPLOAD_MODEL,
} from "./handbook.models";

const oid = (id: string) => new Types.ObjectId(id);

type UploadDoc = Omit<UploadRecord, "id" | "handbookId"> & {
  _id: Types.ObjectId;
  handbookId: Types.ObjectId;
};

const toUpload = (doc: UploadDoc): UploadRecord => ({
  id: doc._id.toHexString(),
  handbookId: doc.handbookId.toHexString(),
  kind: doc.kind as HandbookUploadKind,
  fileName: doc.fileName,
  size: doc.size,
  chunkBytes: doc.chunkBytes,
  chunks: doc.chunks,
  receivedChunks: doc.receivedChunks,
  createdBy: doc.createdBy,
  consumed: doc.consumed,
  createdAt: doc.createdAt,
});

@Injectable()
export class MongoUploadRepository implements UploadRepository {
  constructor(@InjectModel(HANDBOOK_UPLOAD_MODEL) private readonly model: Model<UploadDoc>) {}

  newId() {
    return new Types.ObjectId().toHexString();
  }

  async insert(upload: Omit<UploadRecord, "receivedChunks" | "consumed" | "createdAt">) {
    const [doc] = await this.model.create([
      {
        _id: oid(upload.id),
        schemaVersion: 1,
        handbookId: oid(upload.handbookId),
        kind: upload.kind,
        fileName: upload.fileName,
        size: upload.size,
        chunkBytes: upload.chunkBytes,
        chunks: upload.chunks,
        receivedChunks: 0,
        consumed: false,
        createdBy: upload.createdBy,
      },
    ]);
    return toUpload(doc!.toObject<UploadDoc>());
  }

  async find(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(id).lean<UploadDoc>().exec();
    return doc ? toUpload(doc) : null;
  }

  async advance(id: string, index: number) {
    const result = await this.model
      .updateOne(
        { _id: oid(id), receivedChunks: index, consumed: false },
        { $inc: { receivedChunks: 1 } },
      )
      .exec();
    return result.modifiedCount === 1;
  }

  async markConsumed(ids: readonly string[], tx: TxContext) {
    const result = await this.model
      .updateMany(
        { _id: { $in: ids.map(oid) }, consumed: false },
        { $set: { consumed: true } },
        { session: sessionOf(tx) },
      )
      .exec();
    return result.modifiedCount === ids.length;
  }
}

type JobDoc = {
  _id: Types.ObjectId;
  handbookId: Types.ObjectId;
  draftVersionId: string;
  uploadIds: string[];
  mode: HandbookImportMode;
  pageId: string | null;
  chapterId: string | null;
  status: HandbookImportStatus;
  total: number;
  done: number;
  warnings: ImportWarning[];
  error: ImportError | null;
  leaseUntil: Date | null;
  createdBy: string;
  createdAt: Date;
  finishedAt: Date | null;
};

const toJob = (doc: JobDoc): ImportJobRecord => ({
  id: doc._id.toHexString(),
  handbookId: doc.handbookId.toHexString(),
  draftVersionId: doc.draftVersionId,
  uploadIds: doc.uploadIds,
  mode: doc.mode,
  pageId: doc.pageId ?? null,
  chapterId: doc.chapterId ?? null,
  status: doc.status,
  total: doc.total,
  done: doc.done,
  warnings: (doc.warnings ?? []).map((warning) => ({
    code: warning.code,
    page: warning.page ?? null,
  })),
  error: doc.error ?? null,
  createdBy: doc.createdBy,
  createdAt: doc.createdAt,
  finishedAt: doc.finishedAt ?? null,
});

@Injectable()
export class MongoImportJobRepository implements ImportJobRepository {
  constructor(@InjectModel(HANDBOOK_IMPORT_JOB_MODEL) private readonly model: Model<JobDoc>) {}

  async insert(
    job: Omit<
      ImportJobRecord,
      "id" | "status" | "total" | "done" | "warnings" | "error" | "createdAt" | "finishedAt"
    >,
    tx: TxContext,
  ) {
    const [doc] = await this.model.create(
      [
        {
          schemaVersion: 1,
          ...job,
          handbookId: oid(job.handbookId),
          status: "queued",
          total: 0,
          done: 0,
          warnings: [],
          error: null,
        },
      ],
      { session: sessionOf(tx) },
    );
    return toJob(doc!.toObject<JobDoc>());
  }

  async find(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(id).lean<JobDoc>().exec();
    return doc ? toJob(doc) : null;
  }

  async listRecent(handbookId: string, limit: number) {
    const docs = await this.model
      .find({ handbookId: oid(handbookId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<JobDoc[]>()
      .exec();
    return docs.map(toJob);
  }

  countQueuedBefore(createdAt: Date, id: string) {
    return this.model
      .countDocuments({
        status: "queued",
        $or: [{ createdAt: { $lt: createdAt } }, { createdAt, _id: { $lt: oid(id) } }],
      })
      .exec();
  }

  async claimNext(now: Date, leaseUntil: Date) {
    const doc = await this.model
      .findOneAndUpdate(
        {
          $or: [{ status: "queued" }, { status: "running", leaseUntil: { $lt: now } }],
        },
        // A taken-over job starts again from zero: identical pages are not re-stored.
        { $set: { status: "running", leaseUntil, done: 0 } },
        { sort: { createdAt: 1, _id: 1 }, new: true },
      )
      .lean<JobDoc>()
      .exec();
    return doc ? toJob(doc) : null;
  }

  async progress(id: string, update: { total?: number; done: number; leaseUntil: Date }) {
    await this.model.updateOne({ _id: oid(id), status: "running" }, { $set: update }).exec();
  }

  async finish(
    id: string,
    outcome: { status: "done" | "failed"; warnings: ImportWarning[]; error: ImportError | null },
    at: Date,
  ) {
    await this.model
      .updateOne({ _id: oid(id) }, { $set: { ...outcome, finishedAt: at, leaseUntil: null } })
      .exec();
  }
}

type TokenDoc = { versionId: Types.ObjectId };

@Injectable()
export class MongoHandbookPreviewTokenRepository implements HandbookPreviewTokenRepository {
  constructor(@InjectModel(HANDBOOK_PREVIEW_TOKEN_MODEL) private readonly model: Model<TokenDoc>) {}

  async insert(input: {
    tokenHash: string;
    versionId: string;
    createdBy: string;
    expiresAt: Date;
  }) {
    await this.model.create({ ...input, versionId: oid(input.versionId), schemaVersion: 1 });
  }

  async findVersionId(tokenHash: string, now: Date) {
    // The TTL index removes expired tokens eventually; the date check makes it exact.
    const doc = await this.model
      .findOne({ tokenHash, expiresAt: { $gt: now } }, { versionId: 1 })
      .lean<TokenDoc>()
      .exec();
    return doc ? doc.versionId.toHexString() : null;
  }
}
