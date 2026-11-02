import { Injectable } from "@nestjs/common";
import { InjectModel, MongooseModule } from "@nestjs/mongoose";
import { type FilterQuery, type Model, Schema, Types, mongo } from "mongoose";

import { sessionOf } from "@lavieco/service-kit";
import type { TxContext } from "@lavieco/service-kit/ports";
import { SURVEY_KINDS, SURVEY_STATUSES, type SurveyListQuery } from "@lavieco/shared/events";

import {
  SurveyAlreadyAnsweredError,
  SurveySlugTakenError,
  type SurveyChanges,
  type SurveyRepository,
  type SurveyResponseRecord,
  type SurveyResponseRepository,
} from "../application/survey-service";
import type { SurveyRecord } from "../domain/survey";

export const SURVEY_MODEL = "Survey";
export const SURVEY_RESPONSE_MODEL = "SurveyResponse";

/** `surveys` (docs/03 §9.2). `questions` ≤ SURVEY_LIMITS.questionsMax, by the contract. */
export const surveySchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    kind: { type: String, enum: SURVEY_KINDS, required: true },
    eventId: { type: Schema.Types.ObjectId, default: null },
    slug: { type: String, required: true },
    title: { type: String, required: true },
    intro: { type: String, default: "" },
    thankYouMessage: { type: String, default: "" },
    questions: { type: [Schema.Types.Mixed], default: [] },
    settings: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: SURVEY_STATUSES, required: true, default: "draft" },
    responseCount: { type: Number, required: true, default: 0 },
    revision: { type: Number, required: true, default: 1 },
  },
  { collection: "surveys", timestamps: true },
);
surveySchema.index({ slug: 1 }, { name: "idx_surveys_slug_uq", unique: true });
surveySchema.index(
  { kind: 1, status: 1, createdAt: -1 },
  { name: "idx_surveys_kind_status_created_at" },
);
surveySchema.index({ eventId: 1, status: 1 }, { name: "idx_surveys_event_id_status" });

/**
 * `survey_responses`. `dedupeKey` is an HMAC. On an anonymous survey `name`, `email`,
 * `ticketId` and `orderId` stay null: nothing links a response to a person.
 */
export const surveyResponseSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    surveyId: { type: Schema.Types.ObjectId, required: true },
    dedupeKey: { type: String, required: true },
    answers: { type: [Schema.Types.Mixed], default: [] },
    name: { type: String, default: null },
    email: { type: String, default: null },
    ticketId: { type: Schema.Types.ObjectId, default: null },
    orderId: { type: Schema.Types.ObjectId, default: null },
    consentAt: { type: Date, default: null },
    submittedAt: { type: Date, required: true },
  },
  { collection: "survey_responses", timestamps: false },
);
surveyResponseSchema.index(
  { surveyId: 1, dedupeKey: 1 },
  { name: "idx_survey_responses_survey_id_dedupe_key_uq", unique: true },
);
surveyResponseSchema.index(
  { surveyId: 1, submittedAt: -1 },
  { name: "idx_survey_responses_survey_id_submitted_at" },
);

export const surveyPersistence = MongooseModule.forFeature([
  { name: SURVEY_MODEL, schema: surveySchema },
  { name: SURVEY_RESPONSE_MODEL, schema: surveyResponseSchema },
]);

type SurveyDoc = Omit<SurveyRecord, "id" | "eventId"> & {
  _id: Types.ObjectId;
  eventId: Types.ObjectId | null;
};

const oid = (id: string) => new Types.ObjectId(id);
const isDuplicate = (error: unknown) =>
  error instanceof mongo.MongoServerError && error.code === 11000;

function toRecord(doc: SurveyDoc): SurveyRecord {
  return {
    id: doc._id.toHexString(),
    kind: doc.kind,
    eventId: doc.eventId ? doc.eventId.toHexString() : null,
    slug: doc.slug,
    title: doc.title,
    intro: doc.intro ?? "",
    thankYouMessage: doc.thankYouMessage ?? "",
    questions: doc.questions ?? [],
    settings: doc.settings,
    status: doc.status,
    responseCount: doc.responseCount ?? 0,
    revision: doc.revision,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const stored = (changes: SurveyChanges) => ({
  ...changes,
  eventId: changes.eventId ? oid(changes.eventId) : null,
});

const encodeCursor = (doc: { createdAt: Date; _id: Types.ObjectId }) =>
  Buffer.from(`${doc.createdAt.toISOString()}|${doc._id.toHexString()}`).toString("base64url");

function decodeCursor(cursor: string): { createdAt: Date; id: Types.ObjectId } | null {
  const [at, id] = Buffer.from(cursor, "base64url").toString().split("|");
  if (!at || !id || !Types.ObjectId.isValid(id) || Number.isNaN(Date.parse(at))) return null;
  return { createdAt: new Date(at), id: new Types.ObjectId(id) };
}

@Injectable()
export class MongoSurveyRepository implements SurveyRepository {
  constructor(@InjectModel(SURVEY_MODEL) private readonly model: Model<SurveyDoc>) {}

  newId() {
    return new Types.ObjectId().toHexString();
  }

  async insert(id: string, changes: SurveyChanges, tx?: TxContext) {
    try {
      const [doc] = await this.model.create(
        [
          {
            ...stored(changes),
            _id: oid(id),
            status: "draft",
            responseCount: 0,
            revision: 1,
            schemaVersion: 1,
          },
        ],
        { session: sessionOf(tx) },
      );
      return toRecord(doc!.toObject<SurveyDoc>());
    } catch (error) {
      if (isDuplicate(error)) throw new SurveySlugTakenError();
      throw error;
    }
  }

  async update(id: string, revision: number, changes: SurveyChanges, tx?: TxContext) {
    try {
      const doc = await this.model
        .findOneAndUpdate(
          { _id: oid(id), revision },
          { $set: stored(changes), $inc: { revision: 1 } },
          { new: true, session: sessionOf(tx) },
        )
        .lean<SurveyDoc>()
        .exec();
      return doc ? toRecord(doc) : null;
    } catch (error) {
      if (isDuplicate(error)) throw new SurveySlugTakenError();
      throw error;
    }
  }

  async setStatus(id: string, revision: number, status: SurveyRecord["status"], tx?: TxContext) {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: oid(id), revision },
        { $set: { status }, $inc: { revision: 1 } },
        { new: true, session: sessionOf(tx) },
      )
      .lean<SurveyDoc>()
      .exec();
    return doc ? toRecord(doc) : null;
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(id).lean<SurveyDoc>().exec();
    return doc ? toRecord(doc) : null;
  }

  async findBySlug(slug: string) {
    const doc = await this.model.findOne({ slug }).lean<SurveyDoc>().exec();
    return doc ? toRecord(doc) : null;
  }

  async findOpenFeedback(eventId: string) {
    const doc = await this.model
      .findOne({ eventId: oid(eventId), kind: "event_feedback", status: "open" })
      .sort({ createdAt: -1 })
      .lean<SurveyDoc>()
      .exec();
    return doc ? toRecord(doc) : null;
  }

  async list(query: SurveyListQuery) {
    const filter: FilterQuery<SurveyDoc> = {};
    if (query.kind) filter.kind = query.kind;
    if (query.status) filter.status = query.status;
    if (query.eventId) filter.eventId = oid(query.eventId);
    const after = query.cursor ? decodeCursor(query.cursor) : null;
    const scoped: FilterQuery<SurveyDoc> = after
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
      .lean<SurveyDoc[]>()
      .exec();
    const items = docs.slice(0, query.limit);
    return {
      items: items.map(toRecord),
      nextCursor: docs.length > query.limit ? encodeCursor(items.at(-1)!) : null,
    };
  }

  async countResponse(id: string, maxResponses: number | null, tx: TxContext) {
    const result = await this.model
      .updateOne(
        {
          _id: oid(id),
          status: "open",
          ...(maxResponses === null ? {} : { responseCount: { $lt: maxResponses } }),
        },
        { $inc: { responseCount: 1 } },
        { session: sessionOf(tx) },
      )
      .exec();
    return result.modifiedCount === 1;
  }
}

type ResponseDoc = Omit<SurveyResponseRecord, "id" | "surveyId" | "ticketId" | "orderId"> & {
  _id: Types.ObjectId;
  surveyId: Types.ObjectId;
  dedupeKey: string;
  ticketId: Types.ObjectId | null;
  orderId: Types.ObjectId | null;
};

@Injectable()
export class MongoSurveyResponseRepository implements SurveyResponseRepository {
  constructor(@InjectModel(SURVEY_RESPONSE_MODEL) private readonly model: Model<ResponseDoc>) {}

  async insert(response: Omit<SurveyResponseRecord, "id"> & { dedupeKey: string }, tx: TxContext) {
    try {
      await this.model.create(
        [
          {
            ...response,
            surveyId: oid(response.surveyId),
            ticketId: response.ticketId ? oid(response.ticketId) : null,
            orderId: response.orderId ? oid(response.orderId) : null,
            schemaVersion: 1,
          },
        ],
        { session: sessionOf(tx) },
      );
    } catch (error) {
      if (isDuplicate(error)) throw new SurveyAlreadyAnsweredError();
      throw error;
    }
  }

  async exists(surveyId: string, dedupeKey: string) {
    return (await this.model.exists({ surveyId: oid(surveyId), dedupeKey })) !== null;
  }

  async list(surveyId: string, limit?: number) {
    const query = this.model.find({ surveyId: oid(surveyId) }).sort({ submittedAt: -1, _id: -1 });
    if (limit) query.limit(limit);
    const docs = await query.lean<ResponseDoc[]>().exec();
    return docs.map((doc): SurveyResponseRecord => ({
      id: doc._id.toHexString(),
      surveyId,
      answers: doc.answers ?? [],
      name: doc.name ?? null,
      email: doc.email ?? null,
      ticketId: doc.ticketId ? doc.ticketId.toHexString() : null,
      orderId: doc.orderId ? doc.orderId.toHexString() : null,
      consentAt: doc.consentAt ?? null,
      submittedAt: doc.submittedAt,
    }));
  }

  count(surveyId: string) {
    return this.model.countDocuments({ surveyId: oid(surveyId) }).exec();
  }
}
