import { Injectable } from "@nestjs/common";
import { InjectModel, MongooseModule } from "@nestjs/mongoose";
import { type Model, Schema, Types } from "mongoose";

import type { ImportJobRecord, ImportJobRepository } from "../application/import-service";

export const IMPORT_JOB_MODEL = "ImportJob";

/**
 * `import_jobs` (docs/03 §9.3): rows embedded (≤ 2.000, a few KB each). Deleted by TTL
 * once expired, before the unattached uploads are swept. Holds no personal data.
 */
export const importJobSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    fileName: { type: String, required: true },
    mode: { type: String, required: true },
    status: { type: String, required: true },
    rows: { type: Schema.Types.Mixed, default: [] },
    imageFiles: { type: Schema.Types.Mixed, default: [] },
    removedImages: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { collection: "import_jobs", timestamps: true, minimize: false },
);
importJobSchema.index(
  { expiresAt: 1 },
  { name: "idx_import_jobs_expires_at_ttl", expireAfterSeconds: 0 },
);

export const importJobPersistence = MongooseModule.forFeature([
  { name: IMPORT_JOB_MODEL, schema: importJobSchema },
]);

type JobDoc = Omit<ImportJobRecord, "id"> & { _id: Types.ObjectId };

@Injectable()
export class MongoImportJobRepository implements ImportJobRepository {
  constructor(@InjectModel(IMPORT_JOB_MODEL) private readonly model: Model<JobDoc>) {}

  newId() {
    return new Types.ObjectId().toHexString();
  }

  async insert(job: ImportJobRecord) {
    const { id, ...rest } = job;
    await this.model.create({ ...rest, _id: new Types.ObjectId(id), schemaVersion: 1 });
  }

  async find(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(new Types.ObjectId(id)).lean<JobDoc>().exec();
    if (!doc || doc.expiresAt.getTime() < Date.now()) return null;
    const { _id, ...rest } = doc;
    return { ...rest, id: _id.toHexString() } as ImportJobRecord;
  }

  async save(job: ImportJobRecord) {
    const { id, ...rest } = job;
    await this.model
      .updateOne(
        { _id: new Types.ObjectId(id) },
        {
          $set: {
            status: rest.status,
            rows: rest.rows,
            imageFiles: rest.imageFiles,
            removedImages: rest.removedImages,
          },
        },
      )
      .exec();
  }
}
