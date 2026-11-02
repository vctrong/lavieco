import type {
  CampaignAudience,
  CampaignCreateRequest,
  CampaignType,
  CampaignView,
} from "@lavieco/shared/events";

import { TEXT } from "../constants/text";

export type CtaChoice = "none" | "url" | "ticket" | "survey";

export type CampaignFormValues = {
  name: string;
  type: CampaignType;
  subject: string;
  preheader: string;
  body: string;
  ctaChoice: CtaChoice;
  ctaLabel: string;
  ctaUrl: string;
  eventId: string;
  surveyId: string;
  audienceType: CampaignAudience["type"];
  audienceEventId: string;
  checkin: "all" | "checked_in" | "not_checked_in";
  from: string;
  to: string;
  minOrders: string;
  audienceSurveyId: string;
  manual: string;
};

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

/** `email` or `email,name` per line (a CSV works). What is not an email is counted, not sent. */
export function parseManualList(text: string) {
  const entries: { email: string; name: string }[] = [];
  let bad = 0;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [email = "", ...rest] = trimmed.split(/[,;\t]/);
    if (EMAIL.test(email.trim())) {
      entries.push({ email: email.trim(), name: rest.join(" ").trim() });
    } else {
      bad += 1;
    }
  }
  return { entries, bad };
}

export function emptyValues(): CampaignFormValues {
  const template = TEXT.vi.templates.thank_you;
  return {
    name: "",
    type: "thank_you",
    subject: template.subject,
    preheader: template.preheader,
    body: template.body,
    ctaChoice: "none",
    ctaLabel: "",
    ctaUrl: "",
    eventId: "",
    surveyId: "",
    audienceType: "event",
    audienceEventId: "",
    checkin: "all",
    from: "",
    to: "",
    minOrders: "1",
    audienceSurveyId: "",
    manual: "",
  };
}

export function valuesOf(campaign: CampaignView): CampaignFormValues {
  const { audience } = campaign;
  const base = emptyValues();
  return {
    ...base,
    name: campaign.name,
    type: campaign.type,
    subject: campaign.subject,
    preheader: campaign.preheader,
    body: campaign.body,
    ctaChoice: campaign.cta?.link ?? "none",
    ctaLabel: campaign.cta?.label ?? "",
    ctaUrl: campaign.cta?.url ?? "",
    eventId: campaign.eventId ?? "",
    surveyId: campaign.surveyId ?? "",
    audienceType: audience.type,
    audienceEventId: audience.type === "event" ? audience.eventId : "",
    checkin: audience.type === "event" ? audience.checkin : "all",
    from: audience.type === "past_buyers" ? (audience.from?.slice(0, 10) ?? "") : "",
    to: audience.type === "past_buyers" ? (audience.to?.slice(0, 10) ?? "") : "",
    minOrders: audience.type === "past_buyers" ? String(audience.minOrders) : "1",
    audienceSurveyId: audience.type === "survey_respondents" ? audience.surveyId : "",
    manual:
      audience.type === "manual"
        ? audience.entries
            .map((entry) => (entry.name ? `${entry.email},${entry.name}` : entry.email))
            .join("\n")
        : "",
  };
}

const startOfDay = (day: string) => (day ? `${day}T00:00:00.000+07:00` : null);
const endOfDay = (day: string) => (day ? `${day}T23:59:59.999+07:00` : null);

const toUtc = (iso: string | null) => (iso ? new Date(iso).toISOString() : null);

export function toAudience(values: CampaignFormValues): CampaignAudience {
  switch (values.audienceType) {
    case "event":
      return {
        type: "event",
        eventId: values.audienceEventId,
        checkin: values.checkin,
        ticketTypeIds: [],
      };
    case "past_buyers":
      return {
        type: "past_buyers",
        from: toUtc(startOfDay(values.from)),
        to: toUtc(endOfDay(values.to)),
        minOrders: /^\d+$/.test(values.minOrders.trim()) ? Number(values.minOrders) : 0,
      };
    case "survey_respondents":
      return { type: "survey_respondents", surveyId: values.audienceSurveyId };
    case "manual":
      return { type: "manual", entries: parseManualList(values.manual).entries };
  }
}

export function toCampaignRequest(values: CampaignFormValues): CampaignCreateRequest {
  return {
    name: values.name,
    type: values.type,
    audience: toAudience(values),
    subject: values.subject,
    preheader: values.preheader,
    body: values.body,
    cta:
      values.ctaChoice === "none"
        ? null
        : {
            label: values.ctaLabel,
            link: values.ctaChoice,
            url: values.ctaChoice === "url" ? values.ctaUrl : null,
          },
    eventId:
      values.eventId || (values.audienceType === "event" ? values.audienceEventId : "") || null,
    surveyId: values.surveyId || null,
  };
}
