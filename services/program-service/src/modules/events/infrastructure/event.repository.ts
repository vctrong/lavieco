import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type FilterQuery, type Model, Types, mongo } from "mongoose";

import { sessionOf } from "@lavieco/service-kit";
import type { TxContext } from "@lavieco/service-kit/ports";
import { DomainError, toSearchKey } from "@lavieco/shared";
import {
  EVENT_LIMITS,
  EVENT_STATUSES,
  type EventForm,
  type EventImage,
  type EventListQuery,
  type EventPricing,
  type EventStatus,
  type EventStatusCounts,
  type PublicEventListQuery,
} from "@lavieco/shared/events";

import type {
  EventRepository,
  NewEvent,
  PublicEventRecord,
} from "../application/ports/event-repository.port";
import type { Actor, EventContent, EventRecord, StatusChange } from "../domain/event";
import type { EventImages } from "../domain/event-images";
import { decodeCursor, encodeCursor, monthRange } from "../domain/public-filters";
import { EVENT_MODEL } from "./event.model";

type EventDoc = Omit<EventRecord, "id" | "typeId"> & {
  _id: Types.ObjectId;
  typeId: Types.ObjectId;
  searchKey: string;
  discarded: boolean;
};

/** S3: what a public query reads; private fields are never fetched. */
const PUBLIC_PROJECTION = {
  onlineUrl: 0,
  createdBy: 0,
  updatedBy: 0,
  form: 0,
  revision: 0,
  firstPublishedAt: 0,
  statusHistory: 0,
  searchKey: 0,
  discarded: 0,
  discardedAt: 0,
} as const;

const PUBLIC_STATUSES: EventStatus[] = ["published", "closed", "ended"];

const toImage = (image: EventImage): EventImage => ({
  mediaId: image.mediaId,
  publicId: image.publicId,
  width: image.width,
  height: image.height,
  alt: image.alt,
});

function toPublicRecord(doc: Partial<EventDoc> & { _id: Types.ObjectId }): PublicEventRecord {
  return {
    id: doc._id.toHexString(),
    kind: doc.kind!,
    slug: doc.slug!,
    status: doc.status!,
    title: doc.title!,
    typeId: doc.typeId!.toHexString(),
    format: doc.format!,
    startAt: doc.startAt!,
    endAt: doc.endAt!,
    venue: doc.venue
      ? { name: doc.venue.name, address: doc.venue.address, mapUrl: doc.venue.mapUrl ?? null }
      : null,
    summary: doc.summary ?? "",
    description: doc.description ?? "",
    safetyNotes: doc.safetyNotes ?? "",
    cancellationPolicy: doc.cancellationPolicy ?? "",
    forChildren: doc.forChildren ?? false,
    speakers: doc.speakers ?? [],
    agenda: doc.agenda ?? [],
    faq: doc.faq ?? [],
    cover: doc.cover ? toImage(doc.cover) : null,
    gallery: (doc.gallery ?? []).map(toImage),
    pricing: {
      isFree: doc.pricing?.isFree ?? false,
      priceFrom: doc.pricing?.priceFrom ?? null,
    },
    publishedAt: doc.publishedAt ?? null,
    createdAt: doc.createdAt!,
    updatedAt: doc.updatedAt!,
  };
}

function toRecord(doc: EventDoc): EventRecord {
  return {
    ...toPublicRecord(doc),
    onlineUrl: doc.onlineUrl ?? null,
    form: {
      questions: (doc.form?.questions ?? []).map((question) => ({
        id: question.id,
        type: question.type,
        label: question.label,
        description: question.description ?? "",
        required: question.required,
        options: (question.options ?? []).map((option) => ({ id: option.id, label: option.label })),
        hidden: question.hidden ?? false,
      })),
    },
    firstPublishedAt: doc.firstPublishedAt ?? null,
    revision: doc.revision,
    createdBy: { userId: doc.createdBy.userId },
    updatedBy: { userId: doc.updatedBy.userId },
  };
}

function contentFields(content: EventContent) {
  return {
    ...content,
    typeId: new Types.ObjectId(content.typeId),
    searchKey: toSearchKey(content.title),
  };
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

@Injectable()
export class MongoEventRepository implements EventRepository {
  constructor(@InjectModel(EVENT_MODEL) private readonly model: Model<EventDoc>) {}

  newId() {
    return new Types.ObjectId().toHexString();
  }

  async insert({ id, images, ...input }: NewEvent, tx?: TxContext) {
    try {
      const [doc] = await this.model.create(
        [
          {
            _id: new Types.ObjectId(id),
            ...contentFields(input),
            kind: input.kind,
            slug: input.slug,
            status: "draft",
            cover: images.cover,
            gallery: images.gallery,
            form: input.form,
            pricing: input.pricing,
            publishedAt: null,
            firstPublishedAt: null,
            statusHistory: [],
            discarded: false,
            discardedAt: null,
            revision: 1,
            createdBy: input.createdBy,
            updatedBy: input.createdBy,
            schemaVersion: 1,
          },
        ],
        { session: sessionOf(tx) },
      );
      return toRecord(doc!.toObject<EventDoc>());
    } catch (error) {
      throw this.mapDuplicate(error);
    }
  }

  async findById(id: string, tx?: TxContext) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model
      .findOne({ _id: id, discarded: false })
      .session(sessionOf(tx) ?? null)
      .lean<EventDoc>()
      .exec();
    return doc ? toRecord(doc) : null;
  }

  async usedSlugs(base: string) {
    const docs = await this.model
      .find({ slug: { $regex: `^${escapeRegex(base)}(-\\d+)?$` }, discarded: false }, { slug: 1 })
      .lean<{ slug: string }[]>()
      .exec();
    return new Set(docs.map((doc) => doc.slug));
  }

  async updateContent(
    id: string,
    revision: number,
    changes: { content: EventContent; slug: string; images: EventImages },
    actor: Actor,
    tx?: TxContext,
  ) {
    try {
      return await this.updateLive(
        id,
        revision,
        {
          ...contentFields(changes.content),
          slug: changes.slug,
          cover: changes.images.cover,
          gallery: changes.images.gallery,
          updatedBy: actor,
        },
        tx,
      );
    } catch (error) {
      throw this.mapDuplicate(error);
    }
  }

  updateForm(id: string, revision: number, form: EventForm, actor: Actor, tx?: TxContext) {
    return this.updateLive(id, revision, { form, updatedBy: actor }, tx);
  }

  async changeStatus(
    id: string,
    revision: number,
    change: {
      to: EventStatus;
      history: StatusChange;
      publishedAt: Date | null;
      firstPublish: boolean;
    },
    actor: Actor,
    tx?: TxContext,
  ) {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, revision, discarded: false },
        {
          $set: {
            status: change.to,
            publishedAt: change.publishedAt,
            updatedBy: actor,
            ...(change.firstPublish ? { firstPublishedAt: change.history.at } : {}),
          },
          $push: {
            statusHistory: { $each: [change.history], $slice: -EVENT_LIMITS.statusHistoryMax },
          },
          $inc: { revision: 1 },
        },
        { new: true, session: sessionOf(tx) },
      )
      .lean<EventDoc>()
      .exec();
    return doc ? toRecord(doc) : null;
  }

  async setPricing(id: string, pricing: EventPricing, tx?: TxContext) {
    await this.model.updateOne({ _id: id }, { $set: { pricing } }, { session: sessionOf(tx) });
  }

  async discard(id: string, revision: number, actor: Actor, tx?: TxContext) {
    const result = await this.model.updateOne(
      { _id: id, revision, status: "draft", firstPublishedAt: null, discarded: false },
      {
        $set: { discarded: true, discardedAt: new Date(), updatedBy: actor },
        $inc: { revision: 1 },
      },
      { session: sessionOf(tx) },
    );
    return result.modifiedCount === 1;
  }

  async listAdmin(query: EventListQuery) {
    const filter: FilterQuery<EventDoc> = { discarded: false };
    if (query.kind) filter.kind = query.kind;
    if (query.typeId) filter.typeId = new Types.ObjectId(query.typeId);
    if (query.format) filter.format = query.format;
    if (query.q) filter.searchKey = { $regex: escapeRegex(toSearchKey(query.q)) };

    const grouped = await this.model
      .aggregate<{ _id: EventStatus; count: number }>([
        { $match: filter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .exec();
    const counts = Object.fromEntries([
      ["all", grouped.reduce((sum, row) => sum + row.count, 0)],
      ...EVENT_STATUSES.map((status) => [
        status,
        grouped.find((row) => row._id === status)?.count ?? 0,
      ]),
    ]) as EventStatusCounts;

    if (query.status) filter.status = query.status;
    const page = await this.page(filter, -1, query.cursor, query.limit, {});
    return { items: page.items.map(toRecord), nextCursor: page.nextCursor, counts };
  }

  async listPublic(query: PublicEventListQuery) {
    const filter: FilterQuery<EventDoc> = {
      discarded: false,
      status: query.scope === "past" ? "ended" : { $in: ["published", "closed"] },
    };
    if (query.typeId) filter.typeId = new Types.ObjectId(query.typeId);
    if (query.format) filter.format = query.format;
    if (query.free !== undefined) filter["pricing.isFree"] = query.free;
    if (query.month) {
      const { from, to } = monthRange(query.month);
      filter.startAt = { $gte: from, $lt: to };
    }
    // Upcoming: soonest first. Past: most recent first.
    const direction = query.scope === "past" ? -1 : 1;
    const page = await this.page(filter, direction, query.cursor, query.limit, PUBLIC_PROJECTION);
    return { items: page.items.map(toPublicRecord), nextCursor: page.nextCursor };
  }

  async findPublicBySlug(slug: string) {
    const doc = await this.model
      .findOne({ slug, discarded: false, status: { $in: PUBLIC_STATUSES } }, PUBLIC_PROJECTION)
      .lean<EventDoc>()
      .exec();
    return doc ? toPublicRecord(doc) : null;
  }

  /** Full record of a public event, for the checkout only (never mapped to a public DTO). */
  async findPublicFullBySlug(slug: string, tx?: TxContext) {
    const doc = await this.model
      .findOne({ slug, discarded: false, status: { $in: PUBLIC_STATUSES } })
      .session(sessionOf(tx) ?? null)
      .lean<EventDoc>()
      .exec();
    return doc ? toRecord(doc) : null;
  }

  async findByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const docs = await this.model
      .find({ _id: { $in: ids.map((id) => new Types.ObjectId(id)) } })
      .lean<EventDoc[]>()
      .exec();
    return docs.map(toRecord);
  }

  private async updateLive(
    id: string,
    revision: number,
    set: Record<string, unknown>,
    tx?: TxContext,
  ) {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, revision, discarded: false },
        { $set: set, $inc: { revision: 1 } },
        { new: true, session: sessionOf(tx) },
      )
      .lean<EventDoc>()
      .exec();
    return doc ? toRecord(doc) : null;
  }

  /** Keyset pagination on `(startAt, _id)` in the given direction. */
  private async page(
    filter: FilterQuery<EventDoc>,
    direction: 1 | -1,
    cursorValue: string | undefined,
    limit: number,
    projection: Record<string, 0>,
  ) {
    const cursor = decodeCursor(cursorValue);
    const op = direction === 1 ? "$gt" : "$lt";
    const scoped: FilterQuery<EventDoc> = cursor
      ? {
          $and: [
            filter,
            {
              $or: [
                { startAt: { [op]: cursor.startAt } },
                { startAt: cursor.startAt, _id: { [op]: new Types.ObjectId(cursor.id) } },
              ],
            },
          ],
        }
      : filter;
    const docs = await this.model
      .find(scoped, projection)
      .sort({ startAt: direction, _id: direction })
      .limit(limit + 1)
      .lean<EventDoc[]>()
      .exec();
    const items = docs.slice(0, limit);
    const last = items.at(-1);
    return {
      items,
      nextCursor:
        docs.length > limit && last
          ? encodeCursor({ startAt: last.startAt, id: last._id.toHexString() })
          : null,
    };
  }

  private mapDuplicate(error: unknown) {
    if (error instanceof mongo.MongoServerError && error.code === 11000) {
      return new DomainError("event.slug_taken");
    }
    return error;
  }
}
