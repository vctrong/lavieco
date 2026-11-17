import { Injectable } from "@nestjs/common";
import { InjectModel, MongooseModule } from "@nestjs/mongoose";
import { type Model, Schema, Types } from "mongoose";

import type { CartRepository } from "../application/cart-service";
import type { CartItem, CartRecord } from "../domain/cart";

export const CART_MODEL = "Cart";

const GUEST_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MEMBER_TTL_MS = 180 * 24 * 60 * 60 * 1000;

/** `carts` (docs/03 §9.3): token hash only, variant ids and quantities, no price, no PII. */
export const cartSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    tokenHash: { type: String, required: true },
    userId: { type: String, default: null },
    items: {
      type: [
        {
          variantId: { type: Schema.Types.ObjectId, required: true },
          quantity: { type: Number, required: true },
          addedAt: { type: Date, required: true },
          _id: false,
        },
      ],
      default: [],
    },
    expiresAt: { type: Date, required: true },
  },
  { collection: "carts", timestamps: true },
);
cartSchema.index({ tokenHash: 1 }, { name: "idx_carts_token_hash_uq", unique: true });
cartSchema.index(
  { userId: 1 },
  { name: "idx_carts_user_id", partialFilterExpression: { userId: { $type: "string" } } },
);
cartSchema.index({ expiresAt: 1 }, { name: "idx_carts_expires_at_ttl", expireAfterSeconds: 0 });

export const cartPersistence = MongooseModule.forFeature([
  { name: CART_MODEL, schema: cartSchema },
]);

type CartDoc = {
  _id: Types.ObjectId;
  tokenHash: string;
  userId: string | null;
  items: { variantId: Types.ObjectId; quantity: number; addedAt: Date }[];
};

const toRecord = (doc: CartDoc): CartRecord => ({
  id: doc._id.toHexString(),
  tokenHash: doc.tokenHash,
  userId: doc.userId ?? null,
  items: doc.items.map((item) => ({
    variantId: item.variantId.toHexString(),
    quantity: item.quantity,
    addedAt: item.addedAt,
  })),
});

@Injectable()
export class MongoCartRepository implements CartRepository {
  constructor(@InjectModel(CART_MODEL) private readonly model: Model<CartDoc>) {}

  async findByTokenHash(tokenHash: string) {
    const doc = await this.model.findOne({ tokenHash }).lean<CartDoc>().exec();
    return doc ? toRecord(doc) : null;
  }

  async findByUser(userId: string) {
    const doc = await this.model.findOne({ userId }).sort({ updatedAt: -1 }).lean<CartDoc>().exec();
    return doc ? toRecord(doc) : null;
  }

  async save(tokenHash: string, items: CartItem[], userId: string | null) {
    const expiresAt = new Date(Date.now() + (userId ? MEMBER_TTL_MS : GUEST_TTL_MS));
    await this.model
      .updateOne(
        { tokenHash },
        {
          $set: {
            userId,
            expiresAt,
            items: items.map((item) => ({
              ...item,
              variantId: new Types.ObjectId(item.variantId),
            })),
          },
          $setOnInsert: { tokenHash, schemaVersion: 1 },
        },
        { upsert: true },
      )
      .exec();
  }

  async remove(id: string) {
    await this.model.deleteOne({ _id: new Types.ObjectId(id) }).exec();
  }
}
