import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type Model, Types, mongo } from "mongoose";

import { sessionOf, type TxContext } from "@lavieco/service-kit";
import { DomainError } from "@lavieco/shared";
import type { MediaFormat, MediaPurpose } from "@lavieco/shared/media";

import type {
  MarkDeletedOptions,
  MediaRepository,
  NewMedia,
} from "../application/ports/media-repository.port";
import type { MediaActor, MediaAttachment, MediaRecord, MediaStatus } from "../domain/media";
import { MEDIA_MODEL } from "./media.model";

type MediaDoc = {
  _id: Types.ObjectId;
  purpose: MediaPurpose;
  status: MediaStatus;
  live: boolean;
  publicId: string;
  width: number;
  height: number;
  bytes: number;
  format: MediaFormat;
  sha256: string;
  owner: { kind: "member"; userId: string } | null;
  attachedTo: MediaAttachment | null;
  uploadedBy: MediaActor;
  deletedAt: Date | null;
  storageDeletedAt: Date | null;
  eraseAfterDestroy: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function toRecord(doc: MediaDoc): MediaRecord {
  return {
    id: doc._id.toHexString(),
    purpose: doc.purpose,
    status: doc.status,
    publicId: doc.publicId,
    width: doc.width,
    height: doc.height,
    bytes: doc.bytes,
    format: doc.format,
    sha256: doc.sha256,
    owner: doc.owner ? { kind: "member", userId: doc.owner.userId } : null,
    attachedTo: doc.attachedTo
      ? { service: "program-service", kind: "event", id: doc.attachedTo.id }
      : null,
    uploadedBy: { kind: doc.uploadedBy.kind, userId: doc.uploadedBy.userId },
    deletedAt: doc.deletedAt ?? null,
    storageDeletedAt: doc.storageDeletedAt ?? null,
    eraseAfterDestroy: doc.eraseAfterDestroy ?? false,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const AVATAR_FILTER = { purpose: "avatar" } as const;

@Injectable()
export class MongoMediaRepository implements MediaRepository {
  constructor(@InjectModel(MEDIA_MODEL) private readonly model: Model<MediaDoc>) {}

  newId() {
    return new Types.ObjectId().toHexString();
  }

  async insert(media: NewMedia, tx?: TxContext) {
    try {
      const [doc] = await this.model.create(
        [
          {
            _id: new Types.ObjectId(media.id),
            schemaVersion: 1,
            kind: "image",
            purpose: media.purpose,
            status: media.status,
            live: media.status === "attached",
            publicId: media.publicId,
            width: media.width,
            height: media.height,
            bytes: media.bytes,
            format: media.format,
            sha256: media.sha256,
            exifStripped: true,
            owner: media.owner,
            attachedTo: null,
            uploadedBy: media.uploadedBy,
            eraseAfterDestroy: false,
          },
        ],
        { session: sessionOf(tx) },
      );
      return toRecord(doc!.toObject<MediaDoc>());
    } catch (error) {
      // Two avatar uploads of one member at the same time: the unique index decides.
      if (error instanceof mongo.MongoServerError && error.code === 11000) {
        throw new DomainError("common.conflict");
      }
      throw error;
    }
  }

  async findById(id: string, tx?: TxContext) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model
      .findById(id)
      .session(sessionOf(tx) ?? null)
      .lean<MediaDoc>()
      .exec();
    return doc ? toRecord(doc) : null;
  }

  async markAttached(id: string, attachment: MediaAttachment, purpose: MediaPurpose) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, status: "pending" },
        { $set: { status: "attached", live: true, attachedTo: attachment, purpose } },
        { new: true },
      )
      .lean<MediaDoc>()
      .exec();
    return doc ? toRecord(doc) : null;
  }

  async markDeleted(id: string, at: Date, options: MarkDeletedOptions, tx: TxContext) {
    const session = sessionOf(tx);
    if (options.eraseAfterDestroy) {
      await this.model.updateOne({ _id: id }, { $set: { eraseAfterDestroy: true } }, { session });
    }
    const statusFilter = options.onlyIfPending
      ? { status: "pending" }
      : { status: { $in: ["pending", "attached"] } };
    const result = await this.model.updateOne(
      { _id: id, ...statusFilter },
      { $set: { status: "deleted", live: false, deletedAt: at } },
      { session },
    );
    return result.modifiedCount === 1;
  }

  async markStorageDeleted(id: string, at: Date) {
    await this.model.updateOne({ _id: id }, { $set: { storageDeletedAt: at } });
  }

  async erase(id: string) {
    await this.model.deleteOne({ _id: id, status: "deleted", eraseAfterDestroy: true });
  }

  async findActiveAvatar(userId: string, tx?: TxContext) {
    const doc = await this.model
      .findOne({ ...AVATAR_FILTER, "owner.userId": userId, live: true })
      .session(sessionOf(tx) ?? null)
      .lean<MediaDoc>()
      .exec();
    return doc ? toRecord(doc) : null;
  }

  async listAvatars(userId: string, tx?: TxContext) {
    const docs = await this.model
      .find({ ...AVATAR_FILTER, "owner.userId": userId })
      .session(sessionOf(tx) ?? null)
      .lean<MediaDoc[]>()
      .exec();
    return docs.map(toRecord);
  }

  async listPendingBefore(cutoff: Date, limit: number) {
    const docs = await this.model
      .find({ status: "pending", createdAt: { $lt: cutoff } })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean<MediaDoc[]>()
      .exec();
    return docs.map(toRecord);
  }
}
