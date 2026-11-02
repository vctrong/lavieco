import type { TxContext, UnitOfWork } from "@lavieco/service-kit/ports";
import { DomainError, normalizeEmail } from "@lavieco/shared";
import type {
  AudiencePreview,
  CampaignAudience,
  CampaignCreateRequest,
  CampaignListQuery,
  CampaignRecipientListQuery,
  CampaignRendered,
  CampaignSendRequest,
  CampaignUpdateRequest,
} from "@lavieco/shared/events";
import { CAMPAIGN_LIMITS } from "@lavieco/shared/events";
import type { Role } from "@lavieco/shared/permissions";

import type { AuditTrail } from "../../audit";
import type { EventRecord, EventRepository } from "../../events";
import {
  CLAIM_LEASE_MS,
  MAX_SEND_ATTEMPTS,
  RETRY_AFTER_MS,
  dayOf,
  estimateDays,
  mergeAudience,
  type CampaignContent,
  type CampaignRecord,
  type Candidate,
  type RecipientRecord,
} from "../domain/campaign";

export const CAMPAIGN_REPOSITORY = Symbol("CAMPAIGN_REPOSITORY");
export const CAMPAIGN_RECIPIENT_REPOSITORY = Symbol("CAMPAIGN_RECIPIENT_REPOSITORY");
export const EMAIL_SUPPRESSION_REPOSITORY = Symbol("EMAIL_SUPPRESSION_REPOSITORY");
export const CAMPAIGN_DAILY_USAGE = Symbol("CAMPAIGN_DAILY_USAGE");
export const CAMPAIGN_AUDIENCE_SOURCE = Symbol("CAMPAIGN_AUDIENCE_SOURCE");
export const CAMPAIGN_MAILER = Symbol("CAMPAIGN_MAILER");
export const CAMPAIGN_OPTIONS = Symbol("CAMPAIGN_OPTIONS");

export type CampaignLimits = { dailyLimit: number; ratePerMinute: number };

export interface CampaignRepository {
  newId(): string;
  insert(
    id: string,
    content: CampaignContent,
    source: CampaignRecord["source"],
    tx?: TxContext,
  ): Promise<CampaignRecord>;
  updateDraft(
    id: string,
    revision: number,
    content: CampaignContent,
    tx?: TxContext,
  ): Promise<CampaignRecord | null>;
  findById(id: string): Promise<CampaignRecord | null>;
  list(query: CampaignListQuery): Promise<{ items: CampaignRecord[]; nextCursor: string | null }>;
  /** Moves between statuses only from an expected one; null when it no longer is. */
  transition(
    id: string,
    from: readonly CampaignRecord["status"][],
    changes: {
      status: CampaignRecord["status"];
      scheduledAt?: Date | null;
      total?: number;
      revision?: number;
    },
    tx?: TxContext,
  ): Promise<CampaignRecord | null>;
  dueScheduled(now: Date): Promise<CampaignRecord[]>;
  listSending(limit: number): Promise<CampaignRecord[]>;
  count(id: string, field: "sent" | "failed" | "skipped", by: number): Promise<void>;
}

export interface RecipientRepository {
  /** Idempotent: an email already queued for this campaign is left as it is. */
  insertMany(campaignId: string, recipients: Required<Candidate>[]): Promise<void>;
  countByCampaign(campaignId: string): Promise<number>;
  list(
    campaignId: string,
    query: CampaignRecipientListQuery,
  ): Promise<{ items: RecipientRecord[]; nextCursor: string | null }>;
  findById(id: string): Promise<RecipientRecord | null>;
  /** The oldest due email, atomically: two instances never send the same one. */
  claimNext(campaignId: string, now: Date): Promise<RecipientRecord | null>;
  /** Puts a claim back untouched (the day's budget ran out before sending it). */
  unclaim(id: string): Promise<void>;
  markSent(id: string, at: Date): Promise<void>;
  markSkipped(id: string, reason: string): Promise<void>;
  markFailed(id: string, code: string): Promise<void>;
  retryLater(id: string, code: string, at: Date): Promise<void>;
  /** Claims older than the lease go back in the queue. */
  releaseStale(olderThan: Date): Promise<number>;
  /** Still to do: queued or claimed. */
  countOpen(campaignId: string): Promise<number>;
  /** `failed` → `queued`; returns how many. */
  requeueFailed(campaignId: string): Promise<number>;
}

export interface SuppressionRepository {
  add(emailNormalized: string, reason: string, at: Date): Promise<void>;
  has(emailNormalized: string): Promise<boolean>;
  /** Which of these addresses unsubscribed. */
  filter(emailsNormalized: string[]): Promise<Set<string>>;
}

export interface DailyUsage {
  /** Takes one email of the day's budget, atomically across instances. */
  reserve(day: string, limit: number): Promise<boolean>;
}

/** Turns an audience into people, reading orders, tickets and survey responses. */
export type AudienceSource = (audience: CampaignAudience) => Promise<Candidate[]>;

export interface CampaignMailer {
  /** Renders with a recipient's own links. Null recipient: made-up links, for the preview. */
  render(campaign: CampaignRecord, recipient: RecipientRecord | null): Promise<CampaignRendered>;
  send(campaign: CampaignRecord, recipient: RecipientRecord): Promise<void>;
  sendTest(campaign: CampaignRecord, email: string): Promise<void>;
  verifyUnsubscribe(token: string): string | null;
}

export type CampaignActor = { userId: string; roles: readonly Role[]; requestId: string | null };

/** The text of an automatic campaign, in the service like the ticket email's. */
export type PostEventTexts = {
  name: (eventTitle: string) => string;
  subject: string;
  preheader: string;
  body: string;
  ctaLabel: string;
};

const SENDING_BATCH = 5;
const SYSTEM_ACTOR = { userId: "system", roles: [] as const, requestId: null };

/**
 * Bulk email (ADR-0026). Every email goes through a queue, a budget of its own per day
 * and a pace per minute, so a campaign can never eat the OTP and ticket emails' share of
 * Brevo's 300 a day (ADR-0023). No broker: a scheduler in the service, like the expiry.
 */
export class CampaignService {
  constructor(
    private readonly campaigns: CampaignRepository,
    private readonly recipients: RecipientRepository,
    private readonly suppressions: SuppressionRepository,
    private readonly usage: DailyUsage,
    private readonly source: AudienceSource,
    private readonly mailer: CampaignMailer,
    private readonly events: EventRepository,
    private readonly audit: AuditTrail,
    private readonly unitOfWork: UnitOfWork,
    private readonly limits: CampaignLimits,
    private readonly postEventTexts: PostEventTexts,
  ) {}

  // ----- composing

  list(query: CampaignListQuery) {
    return this.campaigns.list(query);
  }

  async get(id: string): Promise<CampaignRecord> {
    const campaign = await this.campaigns.findById(id);
    if (!campaign) throw new DomainError("common.not_found");
    return campaign;
  }

  estimatedDaysOf(campaign: CampaignRecord): number {
    const done = campaign.counters.sent + campaign.counters.failed + campaign.counters.skipped;
    return estimateDays(campaign.counters.total - done, this.limits);
  }

  create(input: CampaignCreateRequest, actor: CampaignActor, now = new Date()) {
    return this.unitOfWork.run(async (tx) => {
      const saved = await this.campaigns.insert(this.campaigns.newId(), input, "manual", tx);
      await this.record("campaign.create", saved, actor, now, tx, {});
      return saved;
    });
  }

  async update(id: string, input: CampaignUpdateRequest, actor: CampaignActor, now = new Date()) {
    const { revision, ...content } = input;
    return this.unitOfWork.run(async (tx) => {
      const saved = await this.campaigns.updateDraft(id, revision, content, tx);
      // Only a draft can be edited: what is queued has already been promised.
      if (!saved) throw new DomainError("common.conflict");
      await this.record("campaign.update", saved, actor, now, tx, {});
      return saved;
    });
  }

  async previewAudience(audience: CampaignAudience): Promise<AudiencePreview> {
    const merged = await this.resolve(audience);
    return {
      count: merged.recipients.length,
      suppressed: merged.suppressed,
      duplicates: merged.duplicates,
      samples: merged.recipients
        .slice(0, CAMPAIGN_LIMITS.samples)
        .map(({ email, name }) => ({ email, name })),
      estimatedDays: estimateDays(merged.recipients.length, this.limits),
    };
  }

  async render(id: string): Promise<CampaignRendered> {
    return this.mailer.render(await this.get(id), null);
  }

  async sendTest(id: string, email: string, actor: CampaignActor, now = new Date()) {
    const campaign = await this.get(id);
    await this.mailer.sendTest(campaign, email);
    await this.unitOfWork.run((tx) => this.record("campaign.test", campaign, actor, now, tx, {}));
  }

  listRecipients(id: string, query: CampaignRecipientListQuery) {
    return this.recipients.list(id, query);
  }

  // ----- sending

  /**
   * Step-up is checked by the controller. The typed number must match today's count, so
   * nobody confirms a list that changed under them. Sending now freezes the people here;
   * a scheduled campaign freezes them when it starts.
   */
  async send(id: string, input: CampaignSendRequest, actor: CampaignActor, now = new Date()) {
    const campaign = await this.get(id);
    if (campaign.status !== "draft") throw new DomainError("campaign.invalid_state");
    if (campaign.revision !== input.revision) throw new DomainError("common.conflict");
    const merged = await this.resolve(campaign.audience);
    if (merged.recipients.length === 0) throw new DomainError("campaign.empty");
    if (merged.recipients.length !== input.confirmCount) {
      throw new DomainError("campaign.count_mismatch", undefined, {
        count: merged.recipients.length,
      });
    }
    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
    const later = scheduledAt !== null && scheduledAt > now;
    if (!later) await this.recipients.insertMany(id, merged.recipients);
    return this.unitOfWork.run(async (tx) => {
      const saved = await this.campaigns.transition(
        id,
        ["draft"],
        later
          ? { status: "scheduled", scheduledAt, total: merged.recipients.length }
          : { status: "sending", scheduledAt: now, total: merged.recipients.length },
        tx,
      );
      if (!saved) throw new DomainError("common.conflict");
      await this.record("campaign.send", saved, actor, now, tx, {
        recipients: merged.recipients.length,
        scheduled: later,
      });
      return saved;
    });
  }

  pause(id: string, actor: CampaignActor, now = new Date()) {
    return this.move(id, ["sending", "scheduled"], "paused", "campaign.pause", actor, now);
  }

  async resume(id: string, actor: CampaignActor, now = new Date()) {
    const campaign = await this.get(id);
    if (campaign.status !== "paused") throw new DomainError("campaign.invalid_state");
    const queued = await this.recipients.countByCampaign(id);
    // Paused before its start: people are frozen when it actually starts.
    const to = queued === 0 ? "scheduled" : "sending";
    return this.move(id, ["paused"], to, "campaign.resume", actor, now);
  }

  cancel(id: string, actor: CampaignActor, now = new Date()) {
    return this.move(
      id,
      ["draft", "scheduled", "sending", "paused"],
      "cancelled",
      "campaign.cancel",
      actor,
      now,
    );
  }

  async retryFailed(id: string, actor: CampaignActor, now = new Date()) {
    const campaign = await this.get(id);
    if (campaign.status !== "done" && campaign.status !== "sending") {
      throw new DomainError("campaign.invalid_state");
    }
    const count = await this.recipients.requeueFailed(id);
    if (count > 0) await this.campaigns.count(id, "failed", -count);
    return this.move(
      id,
      ["done", "sending"],
      count > 0 ? "sending" : campaign.status,
      "campaign.retry",
      actor,
      now,
    );
  }

  /**
   * One pass of the worker. Budget: `ratePerMinute` per pass (it runs every minute),
   * `dailyLimit` per Vietnam day. Past the daily limit it simply stops: the next day's
   * passes carry on, and OTP and ticket emails were never in this queue.
   */
  async tick(now = new Date()): Promise<{ sent: number; failed: number; skipped: number }> {
    const result = { sent: 0, failed: 0, skipped: 0 };
    await this.createPostEventCampaigns(now);
    await this.startScheduled(now);
    await this.recipients.releaseStale(new Date(now.getTime() - CLAIM_LEASE_MS));

    let budget = this.limits.ratePerMinute;
    const day = dayOf(now);
    for (const campaign of await this.campaigns.listSending(SENDING_BATCH)) {
      while (budget > 0) {
        const recipient = await this.recipients.claimNext(campaign.id, now);
        if (!recipient) break;
        if (await this.suppressions.has(recipient.emailNormalized)) {
          // Unsubscribed after the list was frozen: costs no budget.
          await this.recipients.markSkipped(recipient.id, "unsubscribed");
          await this.campaigns.count(campaign.id, "skipped", 1);
          result.skipped += 1;
          continue;
        }
        if (!(await this.usage.reserve(day, this.limits.dailyLimit))) {
          await this.recipients.unclaim(recipient.id);
          return result;
        }
        budget -= 1;
        await this.deliver(campaign, recipient, now, result);
      }
      if ((await this.recipients.countOpen(campaign.id)) === 0) {
        await this.campaigns.transition(campaign.id, ["sending"], { status: "done" });
      }
      if (budget === 0) break;
    }
    return result;
  }

  private async deliver(
    campaign: CampaignRecord,
    recipient: RecipientRecord,
    now: Date,
    result: { sent: number; failed: number },
  ) {
    try {
      await this.mailer.send(campaign, recipient);
      await this.recipients.markSent(recipient.id, now);
      await this.campaigns.count(campaign.id, "sent", 1);
      result.sent += 1;
    } catch (error) {
      // A name, never the provider's text: it may echo the address.
      const code = error instanceof Error ? error.name : "unknown";
      if (recipient.attempts + 1 >= MAX_SEND_ATTEMPTS) {
        await this.recipients.markFailed(recipient.id, code);
        await this.campaigns.count(campaign.id, "failed", 1);
        result.failed += 1;
      } else {
        await this.recipients.retryLater(
          recipient.id,
          code,
          new Date(now.getTime() + RETRY_AFTER_MS),
        );
      }
    }
  }

  private async startScheduled(now: Date) {
    for (const campaign of await this.campaigns.dueScheduled(now)) {
      const merged = await this.resolve(campaign.audience);
      await this.recipients.insertMany(campaign.id, merged.recipients);
      await this.campaigns.transition(campaign.id, ["scheduled"], {
        status: merged.recipients.length === 0 ? "done" : "sending",
        total: merged.recipients.length,
      });
    }
  }

  /**
   * "Sau sự kiện": once an event has been over for its delay, its campaign appears, once.
   * `markPostEventCampaign` is conditional, so two instances cannot both create it.
   * A draft waits in the list (`source: post_event`) for someone to review and send it.
   */
  private async createPostEventCampaigns(now: Date) {
    for (const event of await this.events.listPostEventDue(now)) {
      const id = this.campaigns.newId();
      if (!(await this.events.markPostEventCampaign(event.id, id))) continue;
      const created = await this.campaigns.insert(id, this.postEventContent(event), "post_event");
      await this.unitOfWork.run((tx) =>
        this.record("campaign.create", created, SYSTEM_ACTOR, now, tx, { eventId: event.id }),
      );
      if (event.postEvent.mode === "send") {
        const merged = await this.resolve(created.audience);
        await this.recipients.insertMany(id, merged.recipients);
        await this.campaigns.transition(id, ["draft"], {
          status: merged.recipients.length === 0 ? "done" : "sending",
          scheduledAt: now,
          total: merged.recipients.length,
        });
      }
    }
  }

  private postEventContent(event: EventRecord): CampaignContent {
    const t = this.postEventTexts;
    const { surveyId, audience } = event.postEvent;
    return {
      name: t.name(event.title),
      type: surveyId ? "feedback_invite" : "thank_you",
      audience: {
        type: "event",
        eventId: event.id,
        checkin: audience === "checked_in" ? "checked_in" : "all",
        ticketTypeIds: [],
      },
      subject: t.subject,
      preheader: t.preheader,
      body: t.body,
      cta: surveyId ? { label: t.ctaLabel, link: "survey", url: null } : null,
      eventId: event.id,
      surveyId,
    };
  }

  // ----- unsubscribe

  /** Whether the token is ours, without changing anything (the confirmation page). */
  async checkUnsubscribe(token: string): Promise<boolean> {
    const recipientId = this.mailer.verifyUnsubscribe(token);
    return recipientId !== null && (await this.recipients.findById(recipientId)) !== null;
  }

  async unsubscribe(token: string, now = new Date()): Promise<void> {
    const recipientId = this.mailer.verifyUnsubscribe(token);
    const recipient = recipientId ? await this.recipients.findById(recipientId) : null;
    if (!recipient) throw new DomainError("common.not_found");
    await this.suppressions.add(recipient.emailNormalized, "unsubscribe_link", now);
  }

  private async resolve(audience: CampaignAudience) {
    const candidates = await this.source(audience);
    const suppressed = await this.suppressions.filter([
      ...new Set(candidates.map((item) => normalizeEmail(item.email))),
    ]);
    return mergeAudience(candidates, suppressed);
  }

  private async move(
    id: string,
    from: readonly CampaignRecord["status"][],
    to: CampaignRecord["status"],
    action: "campaign.pause" | "campaign.resume" | "campaign.cancel" | "campaign.retry",
    actor: CampaignActor,
    now: Date,
  ) {
    return this.unitOfWork.run(async (tx) => {
      const saved = await this.campaigns.transition(id, from, { status: to }, tx);
      if (!saved) throw new DomainError("campaign.invalid_state");
      await this.record(action, saved, actor, now, tx, {});
      return saved;
    });
  }

  /** Ids and counts only: never a recipient. */
  private record(
    action:
      | "campaign.create"
      | "campaign.update"
      | "campaign.test"
      | "campaign.send"
      | "campaign.pause"
      | "campaign.resume"
      | "campaign.cancel"
      | "campaign.retry",
    campaign: CampaignRecord,
    actor: { userId: string; roles: readonly Role[]; requestId: string | null },
    now: Date,
    tx: TxContext,
    meta: Record<string, unknown>,
  ) {
    return this.audit.record(
      tx,
      {
        action,
        actor: { userId: actor.userId, roles: actor.roles },
        target: { type: "campaign", id: campaign.id },
        requestId: actor.requestId,
        meta: { status: campaign.status, ...meta },
      },
      now,
    );
  }
}
