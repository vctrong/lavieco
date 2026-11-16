import { createHash } from "node:crypto";

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type Model, Types, mongo } from "mongoose";

import { pushTopicSchema, type PushTopic } from "@lavieco/shared/identity";

import type {
  PushDeliveryLog,
  PushPreferenceRepository,
  PushSubscriptionRecord,
  PushSubscriptionRepository,
} from "../application/ports/push.ports";
import { PUSH_DELIVERY_MODEL, PUSH_PREFERENCE_MODEL, PUSH_SUBSCRIPTION_MODEL } from "./push.models";

type SubscriptionDoc = {
  _id: Types.ObjectId;
  userId: string;
  endpoint: string;
  endpointHash: string;
  keys: { p256dh: string; auth: string };
  deviceLabel: string;
  createdAt: Date;
};

type PreferenceDoc = { userId: string; topics: string[] };

function endpointHash(endpoint: string): string {
  return createHash("sha256").update(endpoint).digest("hex");
}

function toRecord(doc: SubscriptionDoc): PushSubscriptionRecord {
  return {
    id: doc._id.toHexString(),
    userId: doc.userId,
    endpoint: doc.endpoint,
    keys: { p256dh: doc.keys.p256dh, auth: doc.keys.auth },
    deviceLabel: doc.deviceLabel ?? "",
    createdAt: doc.createdAt,
  };
}

/** Topics read back from the DB, ignoring any value a newer version may have removed. */
function toTopics(values: readonly string[]): PushTopic[] {
  return values.flatMap((value) => {
    const parsed = pushTopicSchema.safeParse(value);
    return parsed.success ? [parsed.data] : [];
  });
}

@Injectable()
export class MongoPushSubscriptionRepository implements PushSubscriptionRepository {
  constructor(
    @InjectModel(PUSH_SUBSCRIPTION_MODEL) private readonly model: Model<SubscriptionDoc>,
  ) {}

  async upsert(
    input: Omit<PushSubscriptionRecord, "id" | "createdAt">,
    maxPerUser: number,
    now: Date,
  ) {
    await this.model
      .updateOne(
        { endpointHash: endpointHash(input.endpoint) },
        {
          $set: {
            userId: input.userId,
            endpoint: input.endpoint,
            keys: input.keys,
            deviceLabel: input.deviceLabel,
            updatedAt: now,
          },
          $setOnInsert: { schemaVersion: 1, createdAt: now, lastDeliveredAt: null },
        },
        { upsert: true, timestamps: false },
      )
      .exec();
    const extra = await this.model
      .find({ userId: input.userId }, { _id: 1 })
      .sort({ createdAt: -1 })
      .skip(maxPerUser)
      .lean<{ _id: Types.ObjectId }[]>()
      .exec();
    if (extra.length > 0) {
      await this.model.deleteMany({ _id: { $in: extra.map((doc) => doc._id) } }).exec();
    }
  }

  async deleteForUser(userId: string, endpoint: string) {
    await this.model.deleteOne({ endpointHash: endpointHash(endpoint), userId }).exec();
  }

  async deleteById(id: string) {
    if (!Types.ObjectId.isValid(id)) return;
    await this.model.deleteOne({ _id: new Types.ObjectId(id) }).exec();
  }

  async listByUsers(userIds: readonly string[]) {
    if (userIds.length === 0) return [];
    const docs = await this.model
      .find({ userId: { $in: [...userIds] } })
      .lean<SubscriptionDoc[]>()
      .exec();
    return docs.map(toRecord);
  }

  async markDelivered(id: string, at: Date) {
    if (!Types.ObjectId.isValid(id)) return;
    await this.model
      .updateOne(
        { _id: new Types.ObjectId(id) },
        { $set: { lastDeliveredAt: at } },
        { timestamps: false },
      )
      .exec();
  }
}

@Injectable()
export class MongoPushPreferenceRepository implements PushPreferenceRepository {
  constructor(@InjectModel(PUSH_PREFERENCE_MODEL) private readonly model: Model<PreferenceDoc>) {}

  async findTopics(userId: string) {
    const doc = await this.model.findOne({ userId }).lean<PreferenceDoc>().exec();
    return doc ? toTopics(doc.topics) : null;
  }

  async findTopicsForUsers(userIds: readonly string[]) {
    const docs = await this.model
      .find({ userId: { $in: [...userIds] } })
      .lean<PreferenceDoc[]>()
      .exec();
    return new Map(docs.map((doc) => [doc.userId, toTopics(doc.topics)]));
  }

  async setTopics(userId: string, topics: readonly PushTopic[], now: Date) {
    await this.model
      .updateOne(
        { userId },
        {
          $set: { topics: [...topics], updatedAt: now },
          $setOnInsert: { schemaVersion: 1, createdAt: now },
        },
        { upsert: true, timestamps: false },
      )
      .exec();
  }
}

@Injectable()
export class MongoPushDeliveryLog implements PushDeliveryLog {
  constructor(
    @InjectModel(PUSH_DELIVERY_MODEL)
    private readonly model: Model<{ notificationId: string; createdAt: Date }>,
  ) {}

  async claim(notificationId: string, now: Date) {
    try {
      await this.model.create({ notificationId, createdAt: now });
      return true;
    } catch (error) {
      if (error instanceof mongo.MongoServerError && error.code === 11000) return false;
      throw error;
    }
  }
}
