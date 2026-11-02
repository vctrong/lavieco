import { normalizeEmail } from "@lavieco/shared";
import type {
  CampaignAudience,
  CampaignCounters,
  CampaignCta,
  CampaignStatus,
  CampaignType,
  RecipientStatus,
} from "@lavieco/shared/events";

/** `campaigns` (docs/03 §9.2, ADR-0026). */
export type CampaignRecord = {
  id: string;
  name: string;
  type: CampaignType;
  audience: CampaignAudience;
  subject: string;
  preheader: string;
  body: string;
  cta: CampaignCta | null;
  eventId: string | null;
  surveyId: string | null;
  scheduledAt: Date | null;
  status: CampaignStatus;
  source: "manual" | "post_event";
  counters: CampaignCounters;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CampaignContent = Pick<
  CampaignRecord,
  "name" | "type" | "audience" | "subject" | "preheader" | "body" | "cta" | "eventId" | "surveyId"
>;

/** One person: what can be said to them and which links are theirs. */
export type RecipientRecord = {
  id: string;
  campaignId: string;
  email: string;
  emailNormalized: string;
  name: string;
  orderIds: string[];
  ticketIds: string[];
  status: RecipientStatus;
  attempts: number;
  error: string | null;
  sentAt: Date | null;
};

export type Candidate = {
  email: string;
  name: string;
  orderIds?: readonly string[];
  ticketIds?: readonly string[];
};

export type MergedAudience = {
  recipients: Required<Candidate>[];
  suppressed: number;
  duplicates: number;
};

/**
 * One email once, whatever the sources; people who unsubscribed are left out. Someone
 * with several orders gets one email, with a link for each of their tickets.
 */
export function mergeAudience(
  candidates: readonly Candidate[],
  suppressed: ReadonlySet<string>,
): MergedAudience {
  const byEmail = new Map<string, Required<Candidate> & { orderSet: Set<string> }>();
  let duplicates = 0;
  let dropped = 0;
  for (const candidate of candidates) {
    const key = normalizeEmail(candidate.email);
    if (suppressed.has(key)) {
      dropped += 1;
      continue;
    }
    const known = byEmail.get(key);
    if (!known) {
      byEmail.set(key, {
        email: candidate.email.trim(),
        name: candidate.name.trim(),
        orderIds: [...(candidate.orderIds ?? [])],
        ticketIds: [...(candidate.ticketIds ?? [])],
        orderSet: new Set(candidate.orderIds ?? []),
      });
      continue;
    }
    duplicates += 1;
    if (!known.name) known.name = candidate.name.trim();
    known.ticketIds = [...known.ticketIds, ...(candidate.ticketIds ?? [])];
    for (const orderId of candidate.orderIds ?? []) known.orderSet.add(orderId);
    known.orderIds = [...known.orderSet];
  }
  return {
    recipients: [...byEmail.values()].map(({ email, name, orderIds, ticketIds }) => ({
      email,
      name,
      orderIds,
      ticketIds,
    })),
    suppressed: dropped,
    duplicates,
  };
}

export const MAX_SEND_ATTEMPTS = 3;
export const RETRY_AFTER_MS = 15 * 60_000;
/** A claim older than this was lost with its instance: the email goes back in the queue. */
export const CLAIM_LEASE_MS = 10 * 60_000;

/** The date a daily limit counts against. */
export const dayOf = (now: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(now);

/** Days at these limits, at least 1: a day cannot send more than its budget. */
export function estimateDays(
  remaining: number,
  limits: { dailyLimit: number; ratePerMinute: number },
): number {
  if (remaining <= 0) return 0;
  const perDay = Math.min(limits.dailyLimit, limits.ratePerMinute * 24 * 60);
  return Math.max(1, Math.ceil(remaining / Math.max(1, perDay)));
}

export type TemplateValues = {
  ten: string;
  chuong_trinh: string;
  ngay: string;
  link_ve: string;
  link_khao_sat: string;
};

/** Replaces `{{biến}}`; an unknown name disappears rather than reaching the reader. */
export function fillVariables(template: string, values: TemplateValues): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_match, name: string) =>
    name in values ? values[name as keyof TemplateValues] : "",
  );
}

export const paragraphsOf = (body: string) =>
  body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

export function emptyCounters(total = 0): CampaignCounters {
  return { total, sent: 0, failed: 0, skipped: 0 };
}
