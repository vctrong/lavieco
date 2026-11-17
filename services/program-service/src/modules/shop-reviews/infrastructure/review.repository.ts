import { Injectable } from "@nestjs/common";
import { InjectModel, MongooseModule } from "@nestjs/mongoose";
import { type Model, Schema, Types, mongo } from "mongoose";

import { REVIEW_STATUSES, type ReviewListQuery, type ReviewStatus } from "@lavieco/shared/shop";

import {
  ReviewTakenError,
  type ReviewRecord,
  type ReviewRepository,
} from "../application/review-service";

export const REVIEW_MODEL = "ProductReview";

/** `product_reviews` (docs/03 §9.3): no email or phone, the reviewer's chosen name only. */
export const reviewSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    schemaVersion: { type: Number, required: true, default: 1 },
    productId: { type: Schema.Types.ObjectId, required: true },
    productSlug: { type: String, required: true },
    productTitle: { type: String, required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    optionLabel: { type: String, default: "" },
    orderId: { type: Schema.Types.ObjectId, required: true },
    userId: { type: String, default: null },
    displayName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    body: { type: String, required: true },
    status: { type: String, enum: REVIEW_STATUSES, required: true },
    moderatedBy: { type: String, default: null },
  },
  { collection: "product_reviews", timestamps: true },
);
reviewSchema.index(
  { orderId: 1, variantId: 1 },
  { name: "idx_product_reviews_order_id_variant_id_uq", unique: true },
);
reviewSchema.index(
  { productId: 1, status: 1, createdAt: -1 },
  { name: "idx_product_reviews_product_id_status_created_at" },
);
reviewSchema.index({ status: 1, createdAt: -1 }, { name: "idx_product_reviews_status_created_at" });

export const reviewPersistence = MongooseModule.forFeature([
  { name: REVIEW_MODEL, schema: reviewSchema },
]);

type ReviewDoc = Omit<ReviewRecord, "id" | "productId" | "variantId" | "orderId"> & {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  orderId: Types.ObjectId;
};

const oid = (id: string) => new Types.ObjectId(id);
const toRecord = (doc: ReviewDoc): ReviewRecord => ({
  ...doc,
  id: doc._id.toHexString(),
  productId: doc.productId.toHexString(),
  variantId: doc.variantId.toHexString(),
  orderId: doc.orderId.toHexString(),
});

const encodeOffset = (offset: number) => Buffer.from(`o:${offset}`).toString("base64url");
const decodeOffset = (cursor?: string) => {
  const n = cursor ? Number(Buffer.from(cursor, "base64url").toString().split(":")[1]) : 0;
  return Number.isInteger(n) && n >= 0 ? n : 0;
};

@Injectable()
export class MongoReviewRepository implements ReviewRepository {
  constructor(@InjectModel(REVIEW_MODEL) private readonly model: Model<ReviewDoc>) {}

  newId() {
    return new Types.ObjectId().toHexString();
  }

  async insert(review: ReviewRecord) {
    try {
      await this.model.create({
        ...review,
        _id: oid(review.id),
        productId: oid(review.productId),
        variantId: oid(review.variantId),
        orderId: oid(review.orderId),
        schemaVersion: 1,
      });
    } catch (error) {
      if (error instanceof mongo.MongoServerError && error.code === 11000)
        throw new ReviewTakenError();
      throw error;
    }
  }

  async reviewedVariants(orderId: string) {
    const docs = await this.model
      .find({ orderId: oid(orderId) }, { variantId: 1 })
      .lean<ReviewDoc[]>()
      .exec();
    return docs.map((doc) => doc.variantId.toHexString());
  }

  async listPublished(productId: string, limit: number) {
    const docs = await this.model
      .find({ productId: oid(productId), status: "published" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<ReviewDoc[]>()
      .exec();
    return docs.map(toRecord);
  }

  async stats(productId: string) {
    const [row] = await this.model
      .aggregate<{ average: number; count: number }>([
        { $match: { productId: oid(productId), status: "published" } },
        { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
      ])
      .exec();
    return { average: row ? Math.round(row.average * 10) / 10 : 0, count: row?.count ?? 0 };
  }

  async list(query: ReviewListQuery) {
    const offset = decodeOffset(query.cursor);
    const docs = await this.model
      .find({ status: query.status })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(query.limit + 1)
      .lean<ReviewDoc[]>()
      .exec();
    return {
      items: docs.slice(0, query.limit).map(toRecord),
      nextCursor: docs.length > query.limit ? encodeOffset(offset + query.limit) : null,
    };
  }

  async setStatus(id: string, status: ReviewStatus, by: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model
      .findOneAndUpdate({ _id: oid(id) }, { $set: { status, moderatedBy: by } }, { new: true })
      .lean<ReviewDoc>()
      .exec();
    return doc ? toRecord(doc) : null;
  }
}
