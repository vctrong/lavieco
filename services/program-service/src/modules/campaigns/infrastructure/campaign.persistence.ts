import { Injectable } from "@nestjs/common";
import { InjectModel, MongooseModule } from "@nestjs/mongoose";
import { type FilterQuery, type Model, Schema, Types, mongo } from "mongoose";

import { sessionOf } from "@lavieco/service-kit";
import type { TxContext } from "@lavieco/service-kit/ports";
import { normalizeEmail } from "@lavieco/shared";
import {
  CAMPAIGN_STATUSES,
  CAMPAIGN_TYPES,
  RECIPIENT_STATUSES,
  type CampaignListQuery,
  type CampaignRecipientListQuery,
} from "@lavieco/shared/events";

import type {
  CampaignRepository,
  DailyUsage,
  RecipientRepository,
  SuppressionRepository,
} from "../application/campaign-service";
import {
  emptyCounters,
  type CampaignContent,
  type CampaignRecord,
  type Candidate,
  type RecipientRecord,
} from "../domain/campaign";

export const CAMPAIGN_MODEL = "Campaign";
export const CAMPAIGN_RECIPIENT_MODEL = "CampaignRecipient";
export const EMAIL_SUPPRESSION_MODEL = "EmailSuppression";
export const CAMPAIGN_DAILY_USAGE_MODEL = "CampaignDailyUsage";

/** `campaigns` (docs/03 §9.2, ADR-0026). */
export const campaignSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    name: { type: String, required: true },
    type: { type: String, enum: CAMPAIGN_TYPES, required: true },
    audience: { type: Schema.Types.Mixed, required: true },
    subject: { type: String, required: true },
    preheader: { type: String, default: "" },
    body: { type: String, required: true },
    cta: { type: Schema.Types.Mixed, default: null },
    eventId: { type: String, default: null },
    surveyId: { type: String, default: null },
    scheduledAt: { type: Date, default: null },
    status: { type: String, enum: CAMPAIGN_STATUSES, required: true, default: "draft" },
    source: { type: String, enum: ["manual", "post_event"], required: true },
    counters: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
    },
    revision: { type: Number, required: true, default: 1 },
  },
  { collection: "campaigns", timestamps: true },
);
campaignSchema.index({ status: 1, scheduledAt: 1 }, { name: "idx_campaigns_status_scheduled_at" });
campaignSchema.index({ createdAt: -1 }, { name: "idx_campaigns_created_at" });

/** `campaign_recipients`: personal data, kept for the send and its follow-up (DQ8). */
export const campaignRecipientSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    campaignId: { type: Schema.Types.ObjectId, required: true },
    email: { type: String, required: true },
    emailNormalized: { type: String, required: true },
    name: { type: String, default: "" },
    orderIds: { type: [String], default: [] },
    ticketIds: { type: [String], default: [] },
    status: { type: String, enum: RECIPIENT_STATUSES, required: true, default: "queued" },
    attempts: { type: Number, default: 0 },
    error: { type: String, default: null },
    nextAttemptAt: { type: Date, default: null },
    claimedAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
  },
  { collection: "campaign_recipients", timestamps: true },
);
campaignRecipientSchema.index(
  { campaignId: 1, emailNormalized: 1 },
  { name: "idx_campaign_recipients_campaign_id_email_uq", unique: true },
);
campaignRecipientSchema.index(
  { campaignId: 1, status: 1, nextAttemptAt: 1, _id: 1 },
  { name: "idx_campaign_recipients_campaign_id_status_next_attempt" },
);
campaignRecipientSchema.index(
  { status: 1, claimedAt: 1 },
  { name: "idx_campaign_recipients_status_claimed_at" },
);

/** `email_suppressions`: who unsubscribed; kept for as long as the address is on file. */
export const emailSuppressionSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    emailNormalized: { type: String, required: true },
    reason: { type: String, required: true },
    at: { type: Date, required: true },
  },
  { collection: "email_suppressions" },
);
emailSuppressionSchema.index(
  { emailNormalized: 1 },
  { name: "idx_email_suppressions_email_uq", unique: true },
);

/** `campaign_daily_usage`: emails a campaign used per Vietnam day. No personal data. */
export const campaignDailyUsageSchema = new Schema(
  { day: { type: String, required: true }, sent: { type: Number, required: true, default: 0 } },
  { collection: "campaign_daily_usage", versionKey: false },
);
campaignDailyUsageSchema.index(
  { day: 1 },
  { name: "idx_campaign_daily_usage_day_uq", unique: true },
);

export const campaignPersistence = MongooseModule.forFeature([
  { name: CAMPAIGN_MODEL, schema: campaignSchema },
  { name: CAMPAIGN_RECIPIENT_MODEL, schema: campaignRecipientSchema },
  { name: EMAIL_SUPPRESSION_MODEL, schema: emailSuppressionSchema },
  { name: CAMPAIGN_DAILY_USAGE_MODEL, schema: campaignDailyUsageSchema },
]);

type CampaignDoc = Omit<CampaignRecord, "id"> & { _id: Types.ObjectId };

const oid = (id: string) => new Types.ObjectId(id);
const isDuplicate = (error: unknown) =>
  error instanceof mongo.MongoServerError && error.code === 11000;

const toCampaign = (doc: CampaignDoc): CampaignRecord => ({
  id: doc._id.toHexString(),
  name: doc.name,
  type: doc.type,
  audience: doc.audience,
  subject: doc.subject,
  preheader: doc.preheader ?? "",
  body: doc.body,
  cta: doc.cta ?? null,
  eventId: doc.eventId ?? null,
  surveyId: doc.surveyId ?? null,
  scheduledAt: doc.scheduledAt ?? null,
  status: doc.status,
  source: doc.source,
  counters: doc.counters ?? emptyCounters(),
  revision: doc.revision,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const encodeCursor = (doc: { createdAt: Date; _id: Types.ObjectId }) =>
  Buffer.from(`${doc.createdAt.toISOString()}|${doc._id.toHexString()}`).toString("base64url");

function decodeCursor(cursor: string): { createdAt: Date; id: Types.ObjectId } | null {
  const [at, id] = Buffer.from(cursor, "base64url").toString().split("|");
  if (!at || !id || !Types.ObjectId.isValid(id) || Number.isNaN(Date.parse(at))) return null;
  return { createdAt: new Date(at), id: new Types.ObjectId(id) };
}

@Injectable()
export class MongoCampaignRepository implements CampaignRepository {
  constructor(@InjectModel(CAMPAIGN_MODEL) private readonly model: Model<CampaignDoc>) {}

  newId() {
    return new Types.ObjectId().toHexString();
  }

  async insert(
    id: string,
    content: CampaignContent,
    source: CampaignRecord["source"],
    tx?: TxContext,
  ) {
    const [doc] = await this.model.create(
      [
        {
          ...content,
          _id: oid(id),
          source,
          status: "draft",
          counters: emptyCounters(),
          revision: 1,
          schemaVersion: 1,
        },
      ],
      { session: sessionOf(tx) },
    );
    return toCampaign(doc!.toObject<CampaignDoc>());
  }

  async updateDraft(id: string, revision: number, content: CampaignContent, tx?: TxContext) {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: oid(id), revision, status: "draft" },
        { $set: content, $inc: { revision: 1 } },
        { new: true, session: sessionOf(tx) },
      )
      .lean<CampaignDoc>()
      .exec();
    return doc ? toCampaign(doc) : null;
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(id).lean<CampaignDoc>().exec();
    return doc ? toCampaign(doc) : null;
  }

  async list(query: CampaignListQuery) {
    const filter: FilterQuery<CampaignDoc> = {};
    if (query.status) filter.status = query.status;
    const after = query.cursor ? decodeCursor(query.cursor) : null;
    const scoped: FilterQuery<CampaignDoc> = after
      ? {
          $and: [
            filter,
            {
              $or: [
                { createdAt: { $lt: after.createdAt } },
                { createdAt: after.createdAt, _id: { $lt: after.id } },
              ],
            },
          ],
        }
      : filter;
    const docs = await this.model
      .find(scoped)
      .sort({ createdAt: -1, _id: -1 })
      .limit(query.limit + 1)
      .lean<CampaignDoc[]>()
      .exec();
    const items = docs.slice(0, query.limit);
    return {
      items: items.map(toCampaign),
      nextCursor: docs.length > query.limit ? encodeCursor(items.at(-1)!) : null,
    };
  }

  async transition(
    id: string,
    from: readonly CampaignRecord["status"][],
    changes: {
      status: CampaignRecord["status"];
      scheduledAt?: Date | null;
      total?: number;
    },
    tx?: TxContext,
  ) {
    const set: Record<string, unknown> = { status: changes.status };
    if (changes.scheduledAt !== undefined) set.scheduledAt = changes.scheduledAt;
    if (changes.total !== undefined) set["counters.total"] = changes.total;
    const doc = await this.model
      .findOneAndUpdate(
        { _id: oid(id), status: { $in: from } },
        { $set: set, $inc: { revision: 1 } },
        { new: true, session: sessionOf(tx) },
      )
      .lean<CampaignDoc>()
      .exec();
    return doc ? toCampaign(doc) : null;
  }

  async dueScheduled(now: Date) {
    const docs = await this.model
      .find({ status: "scheduled", scheduledAt: { $lte: now } })
      .limit(20)
      .lean<CampaignDoc[]>()
      .exec();
    return docs.map(toCampaign);
  }

  async listSending(limit: number) {
    const docs = await this.model
      .find({ status: "sending" })
      .sort({ scheduledAt: 1, _id: 1 })
      .limit(limit)
      .lean<CampaignDoc[]>()
      .exec();
    return docs.map(toCampaign);
  }

  async count(id: string, field: "sent" | "failed" | "skipped", by: number) {
    await this.model.updateOne({ _id: oid(id) }, { $inc: { [`counters.${field}`]: by } }).exec();
  }
}

type RecipientDoc = Omit<RecipientRecord, "id" | "campaignId"> & {
  _id: Types.ObjectId;
  campaignId: Types.ObjectId;
};

const toRecipient = (doc: RecipientDoc): RecipientRecord => ({
  id: doc._id.toHexString(),
  campaignId: doc.campaignId.toHexString(),
  email: doc.email,
  emailNormalized: doc.emailNormalized,
  name: doc.name ?? "",
  orderIds: doc.orderIds ?? [],
  ticketIds: doc.ticketIds ?? [],
  status: doc.status,
  attempts: doc.attempts ?? 0,
  error: doc.error ?? null,
  sentAt: doc.sentAt ?? null,
});

@Injectable()
export class MongoRecipientRepository implements RecipientRepository {
  constructor(@InjectModel(CAMPAIGN_RECIPIENT_MODEL) private readonly model: Model<RecipientDoc>) {}

  async insertMany(campaignId: string, recipients: Required<Candidate>[]) {
    if (recipients.length === 0) return;
    try {
      await this.model.insertMany(
        recipients.map((recipient) => ({
          ...recipient,
          campaignId: oid(campaignId),
          emailNormalized: normalizeEmail(recipient.email),
          status: "queued",
          attempts: 0,
          schemaVersion: 1,
        })),
        { ordered: false },
      );
    } catch (error) {
      // Started twice (a retry, a crash): whoever is already queued stays as they are.
      if (!isDuplicate(error)) throw error;
    }
  }

  countByCampaign(campaignId: string) {
    return this.model.countDocuments({ campaignId: oid(campaignId) }).exec();
  }

  async list(campaignId: string, query: CampaignRecipientListQuery) {
    const filter: FilterQuery<RecipientDoc> = { campaignId: oid(campaignId) };
    if (query.status) filter.status = query.status;
    if (query.cursor && Types.ObjectId.isValid(query.cursor)) {
      filter._id = { $gt: oid(query.cursor) };
    }
    const docs = await this.model
      .find(filter)
      .sort({ _id: 1 })
      .limit(query.limit + 1)
      .lean<RecipientDoc[]>()
      .exec();
    const items = docs.slice(0, query.limit);
    return {
      items: items.map(toRecipient),
      nextCursor: docs.length > query.limit ? items.at(-1)!._id.toHexString() : null,
    };
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(id).lean<RecipientDoc>().exec();
    return doc ? toRecipient(doc) : null;
  }

  async claimNext(campaignId: string, now: Date) {
    const doc = await this.model
      .findOneAndUpdate(
        {
          campaignId: oid(campaignId),
          status: "queued",
          $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: now } }],
        },
        { $set: { status: "sending", claimedAt: now } },
        { new: true, sort: { _id: 1 } },
      )
      .lean<RecipientDoc>()
      .exec();
    return doc ? toRecipient(doc) : null;
  }

  async unclaim(id: string) {
    await this.model
      .updateOne({ _id: oid(id) }, { $set: { status: "queued", claimedAt: null } })
      .exec();
  }

  async markSent(id: string, at: Date) {
    await this.model
      .updateOne(
        { _id: oid(id) },
        { $set: { status: "sent", sentAt: at, error: null, claimedAt: null } },
      )
      .exec();
  }

  async markSkipped(id: string, reason: string) {
    await this.model
      .updateOne({ _id: oid(id) }, { $set: { status: "skipped", error: reason, claimedAt: null } })
      .exec();
  }

  async markFailed(id: string, code: string) {
    await this.model
      .updateOne(
        { _id: oid(id) },
        { $set: { status: "failed", error: code, claimedAt: null }, $inc: { attempts: 1 } },
      )
      .exec();
  }

  async retryLater(id: string, code: string, at: Date) {
    await this.model
      .updateOne(
        { _id: oid(id) },
        {
          $set: { status: "queued", error: code, nextAttemptAt: at, claimedAt: null },
          $inc: { attempts: 1 },
        },
      )
      .exec();
  }

  async releaseStale(olderThan: Date) {
    const result = await this.model
      .updateMany(
        { status: "sending", claimedAt: { $lte: olderThan } },
        { $set: { status: "queued", claimedAt: null } },
      )
      .exec();
    return result.modifiedCount;
  }

  countOpen(campaignId: string) {
    return this.model
      .countDocuments({ campaignId: oid(campaignId), status: { $in: ["queued", "sending"] } })
      .exec();
  }

  async requeueFailed(campaignId: string) {
    const result = await this.model
      .updateMany(
        { campaignId: oid(campaignId), status: "failed" },
        { $set: { status: "queued", attempts: 0, nextAttemptAt: null } },
      )
      .exec();
    return result.modifiedCount;
  }
}

type SuppressionDoc = { emailNormalized: string; reason: string; at: Date };

@Injectable()
export class MongoSuppressionRepository implements SuppressionRepository {
  constructor(
    @InjectModel(EMAIL_SUPPRESSION_MODEL) private readonly model: Model<SuppressionDoc>,
  ) {}

  async add(emailNormalized: string, reason: string, at: Date) {
    await this.model
      .updateOne(
        { emailNormalized },
        { $setOnInsert: { emailNormalized, reason, at, schemaVersion: 1 } },
        { upsert: true },
      )
      .exec();
  }

  async has(emailNormalized: string) {
    return (await this.model.exists({ emailNormalized })) !== null;
  }

  async filter(emailsNormalized: string[]) {
    if (emailsNormalized.length === 0) return new Set<string>();
    const docs = await this.model
      .find({ emailNormalized: { $in: emailsNormalized } }, { emailNormalized: 1 })
      .lean<{ emailNormalized: string }[]>()
      .exec();
    return new Set(docs.map((doc) => doc.emailNormalized));
  }
}

@Injectable()
export class MongoDailyUsage implements DailyUsage {
  constructor(
    @InjectModel(CAMPAIGN_DAILY_USAGE_MODEL)
    private readonly model: Model<{ day: string; sent: number }>,
  ) {}

  async reserve(day: string, limit: number) {
    try {
      const doc = await this.model
        .findOneAndUpdate(
          { day, sent: { $lt: limit } },
          { $inc: { sent: 1 } },
          { upsert: true, new: true },
        )
        .lean()
        .exec();
      return doc !== null;
    } catch (error) {
      // The filter found no room, so the upsert hit the unique day: the budget is spent.
      if (isDuplicate(error)) return false;
      throw error;
    }
  }
}
