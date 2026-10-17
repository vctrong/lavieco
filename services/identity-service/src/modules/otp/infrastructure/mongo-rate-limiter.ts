import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type Model, mongo } from "mongoose";

import type { RateLimiter } from "../application/ports/otp.ports";
import { RATE_LIMIT_BUCKET_MODEL } from "./rate-limit-bucket.model";

type Bucket = { key: string; count: number; expiresAt: Date };

/** Atomic fixed window: one upsert with a pipeline restarts the window once it expired. */
@Injectable()
export class MongoRateLimiter implements RateLimiter {
  constructor(@InjectModel(RATE_LIMIT_BUCKET_MODEL) private readonly model: Model<Bucket>) {}

  async hit(key: string, limit: number, windowSeconds: number, now: Date) {
    const windowEnd = new Date(now.getTime() + windowSeconds * 1000);
    const update = [
      {
        $set: {
          restart: {
            $or: [
              { $eq: [{ $ifNull: ["$expiresAt", null] }, null] },
              { $lte: ["$expiresAt", now] },
            ],
          },
        },
      },
      {
        $set: {
          count: { $cond: ["$restart", 1, { $add: ["$count", 1] }] },
          expiresAt: { $cond: ["$restart", windowEnd, "$expiresAt"] },
        },
      },
      { $unset: "restart" },
    ];

    let bucket: Bucket | null = null;
    for (let attempt = 0; attempt < 2 && !bucket; attempt += 1) {
      try {
        bucket = await this.model
          .findOneAndUpdate({ key }, update, { upsert: true, new: true })
          .lean<Bucket>()
          .exec();
      } catch (error) {
        // Two first hits raced on the unique key: the second one retries as an update.
        if (!(error instanceof mongo.MongoServerError && error.code === 11000)) throw error;
      }
    }
    if (!bucket) throw new Error("rate limiter: no bucket after retry");

    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((bucket.expiresAt.getTime() - now.getTime()) / 1000),
    );
    return { allowed: bucket.count <= limit, retryAfterSeconds };
  }
}
