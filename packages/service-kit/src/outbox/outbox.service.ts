import { Inject, Injectable, type OnApplicationShutdown, type OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";

import type { Logger } from "@lavieco/observability";

import { LOGGER } from "../logging/logging.module";
import { sessionOf } from "../mongo/mongo.module";
import type { OutboxJob, OutboxPort, TxContext } from "../ports";
import { OUTBOX_MODEL, OUTBOX_RETENTION_DAYS, type OutboxStatus } from "./outbox.model";

export type OutboxHandler = (payload: OutboxJob["payload"]) => Promise<void>;

export const OUTBOX_OPTIONS = Symbol("OUTBOX_OPTIONS");

export type OutboxOptions = {
  /** Start the polling worker (off in tests that drive `drainOnce` themselves). */
  runWorker: boolean;
  pollIntervalMs: number;
  leaseMs: number;
  maxAttempts: number;
};

type OutboxDoc = {
  _id: unknown;
  type: string;
  payload: OutboxJob["payload"];
  status: OutboxStatus;
  attempts: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Writes jobs inside the caller's transaction (S5). */
@Injectable()
export class OutboxWriter implements OutboxPort {
  constructor(@InjectModel(OUTBOX_MODEL) private readonly model: Model<OutboxDoc>) {}

  async enqueue(tx: TxContext, job: OutboxJob): Promise<void> {
    await this.model.create(
      [{ type: job.type, payload: job.payload, status: "pending", availableAt: new Date() }],
      { session: sessionOf(tx) },
    );
  }
}

/**
 * Polls the outbox, runs the handler registered for each job type, retries with
 * exponential backoff and parks a job as `dead` after `maxAttempts` (logged as an
 * error so monitoring picks it up). A lease makes a crashed worker's job retryable.
 */
@Injectable()
export class OutboxWorker implements OnModuleInit, OnApplicationShutdown {
  private readonly handlers = new Map<string, OutboxHandler>();
  private timer: NodeJS.Timeout | null = null;
  private draining = false;

  constructor(
    @InjectModel(OUTBOX_MODEL) private readonly model: Model<OutboxDoc>,
    @Inject(OUTBOX_OPTIONS) private readonly options: OutboxOptions,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  /** Called by each service's `outbox` module for the job types it owns. */
  register(type: string, handler: OutboxHandler) {
    if (this.handlers.has(type)) throw new Error(`Outbox handler already registered: ${type}`);
    this.handlers.set(type, handler);
  }

  onModuleInit() {
    if (!this.options.runWorker) return;
    this.timer = setInterval(() => void this.drainOnce(), this.options.pollIntervalMs);
    this.timer.unref();
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Processes every job that is due; returns how many were handled. */
  async drainOnce(now: () => Date = () => new Date()): Promise<number> {
    if (this.draining) return 0;
    this.draining = true;
    let processed = 0;
    try {
      for (;;) {
        const job = await this.claim(now());
        if (!job) break;
        await this.process(job, now());
        processed += 1;
      }
    } finally {
      this.draining = false;
    }
    return processed;
  }

  private claim(at: Date) {
    return this.model
      .findOneAndUpdate(
        {
          $or: [
            { status: "pending", availableAt: { $lte: at } },
            { status: "processing", lockedUntil: { $lt: at } },
          ],
        },
        {
          $set: {
            status: "processing",
            lockedUntil: new Date(at.getTime() + this.options.leaseMs),
          },
          $inc: { attempts: 1 },
        },
        { sort: { availableAt: 1 }, new: true },
      )
      .lean<OutboxDoc>()
      .exec();
  }

  private async process(job: OutboxDoc, at: Date) {
    const handler = this.handlers.get(job.type);
    try {
      if (!handler) throw new OutboxNoHandlerError();
      await handler(job.payload);
      await this.model.updateOne(
        { _id: job._id },
        {
          $set: {
            status: "done",
            lockedUntil: null,
            lastErrorCode: null,
            purgeAt: new Date(at.getTime() + OUTBOX_RETENTION_DAYS * DAY_MS),
          },
        },
      );
    } catch (error) {
      const errorCode = error instanceof Error ? error.name : "unknown";
      const dead = !handler || job.attempts >= this.options.maxAttempts;
      await this.model.updateOne(
        { _id: job._id },
        {
          $set: dead
            ? { status: "dead", lockedUntil: null, lastErrorCode: errorCode }
            : {
                status: "pending",
                lockedUntil: null,
                lastErrorCode: errorCode,
                availableAt: new Date(at.getTime() + backoffMs(job.attempts)),
              },
        },
      );
      const fields = {
        jobId: String(job._id),
        jobType: job.type,
        attempts: job.attempts,
        errorCode,
      };
      if (dead) this.logger.error("outbox job parked as dead", fields);
      else this.logger.warn("outbox job failed, will retry", fields);
    }
  }
}

class OutboxNoHandlerError extends Error {
  override name = "OutboxNoHandlerError";
}

/** 30 s, 1 min, 2 min ... capped at 1 hour. */
export function backoffMs(attempts: number): number {
  return Math.min(30_000 * 2 ** Math.max(0, attempts - 1), 60 * 60 * 1000);
}
