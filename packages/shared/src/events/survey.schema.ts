import { z } from "zod";

import { isoDateTimeSchema, objectIdSchema } from "../common/object-id";
import { cursorPageQuerySchema, cursorPageSchema } from "../common/pagination";
import { emailSchema } from "../identity/password";
import { QUESTION_TYPES } from "./enums";
import { formOptionSchema } from "./event-form.schema";

export const SURVEY_LIMITS = {
  slugMax: 80,
  titleMax: 160,
  introMax: 2_000,
  thankYouMax: 1_000,
  consentMax: 1_000,
  questionsMax: 60,
  optionsMax: 20,
  labelMax: 300,
  answerTextMax: 4_000,
  nameMax: 120,
  maxResponses: 100_000,
  ratingMin: 1,
  ratingMax: 5,
  scaleMin: 0,
  scaleMax: 10,
} as const;

export const SURVEY_KINDS = ["standalone", "event_feedback"] as const;
export const surveyKindSchema = z.enum(SURVEY_KINDS);
export type SurveyKind = z.infer<typeof surveyKindSchema>;

export const SURVEY_STATUSES = ["draft", "open", "closed"] as const;
export const surveyStatusSchema = z.enum(SURVEY_STATUSES);
export type SurveyStatus = z.infer<typeof surveyStatusSchema>;

/** The registration form's types, plus stars, a 0–10 scale and a section heading. */
export const SURVEY_QUESTION_TYPES = [...QUESTION_TYPES, "rating", "scale", "section"] as const;
export const surveyQuestionTypeSchema = z.enum(SURVEY_QUESTION_TYPES);
export type SurveyQuestionType = z.infer<typeof surveyQuestionTypeSchema>;

export const SURVEY_ACCESSES = ["public_link", "ticket_holders"] as const;
export const SURVEY_ONE_PER = ["ticket", "email", "browser"] as const;
export const SURVEY_COLLECT = ["off", "optional", "required"] as const;
export type SurveyCollect = (typeof SURVEY_COLLECT)[number];

const CHOICE_TYPES: readonly SurveyQuestionType[] = [
  "single_choice",
  "multiple_choice",
  "dropdown",
];
export const isSurveyChoice = (type: SurveyQuestionType) => CHOICE_TYPES.includes(type);

export const surveyQuestionSchema = z
  .object({
    /** UUID, immutable: answers are keyed by it. */
    id: z.uuid(),
    type: surveyQuestionTypeSchema,
    label: z.string().trim().min(1).max(SURVEY_LIMITS.labelMax),
    description: z.string().trim().max(500).default(""),
    required: z.boolean().default(false),
    options: z.array(formOptionSchema).max(SURVEY_LIMITS.optionsMax).default([]),
    /** `scale`: words at the two ends ("Không hề" … "Chắc chắn"). */
    scaleLow: z.string().trim().max(60).default(""),
    scaleHigh: z.string().trim().max(60).default(""),
  })
  .superRefine((question, ctx) => {
    if (isSurveyChoice(question.type) !== question.options.length > 0) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "Options do not fit the type" });
    }
  });
export type SurveyQuestion = z.infer<typeof surveyQuestionSchema>;

const settingsShape = {
  /** Nothing links a response to a person: only a hash, to refuse a second answer. */
  anonymous: z.boolean().default(false),
  collectEmail: z.enum(SURVEY_COLLECT).default("off"),
  collectName: z.enum(SURVEY_COLLECT).default("off"),
  access: z.enum(SURVEY_ACCESSES).default("public_link"),
  onePer: z.enum(SURVEY_ONE_PER).default("browser"),
  opensAt: isoDateTimeSchema.nullable().default(null),
  closesAt: isoDateTimeSchema.nullable().default(null),
  maxResponses: z.number().int().min(1).max(SURVEY_LIMITS.maxResponses).nullable().default(null),
  /** BR-06: asked and stored whenever personal data is collected. */
  consentText: z.string().trim().max(SURVEY_LIMITS.consentMax).default(""),
};
export const surveySettingsSchema = z.object(settingsShape);
export type SurveySettings = z.infer<typeof surveySettingsSchema>;

const surveyShape = {
  kind: surveyKindSchema,
  eventId: objectIdSchema.nullable().default(null),
  slug: z
    .string()
    .min(3)
    .max(SURVEY_LIMITS.slugMax)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lower-case letters, digits and single dashes"),
  title: z.string().trim().min(1).max(SURVEY_LIMITS.titleMax),
  intro: z.string().trim().max(SURVEY_LIMITS.introMax).default(""),
  thankYouMessage: z.string().trim().max(SURVEY_LIMITS.thankYouMax).default(""),
  questions: z.array(surveyQuestionSchema).max(SURVEY_LIMITS.questionsMax),
  settings: surveySettingsSchema,
};

type SurveyRuleInput = {
  kind: SurveyKind;
  eventId: string | null;
  questions: SurveyQuestion[];
  settings: SurveySettings;
};

function refineSurvey(input: SurveyRuleInput, ctx: z.RefinementCtx) {
  const issue = (path: (string | number)[], message: string) =>
    ctx.addIssue({ code: "custom", path, message });
  const { settings } = input;
  if (input.kind === "event_feedback" && input.eventId === null) {
    issue(["eventId"], "Event required");
  }
  if (settings.anonymous && (settings.collectEmail !== "off" || settings.collectName !== "off")) {
    issue(["settings", "anonymous"], "An anonymous survey collects no name or email");
  }
  if ((settings.access === "ticket_holders") !== (settings.onePer === "ticket")) {
    issue(["settings", "onePer"], "One per ticket goes with ticket holders only");
  }
  if (settings.access === "ticket_holders" && input.kind !== "event_feedback") {
    issue(["settings", "access"], "Ticket holders only exist for an event");
  }
  if (settings.onePer === "email" && settings.collectEmail !== "required") {
    issue(["settings", "onePer"], "One per email needs the email");
  }
  if (settings.opensAt && settings.closesAt) {
    if (Date.parse(settings.opensAt) >= Date.parse(settings.closesAt)) {
      issue(["settings", "closesAt"], "Close must be after open");
    }
  }
  if (new Set(input.questions.map((question) => question.id)).size !== input.questions.length) {
    issue(["questions"], "Duplicate question id");
  }
}

export const surveyCreateRequestSchema = z.object(surveyShape).superRefine(refineSurvey);
export type SurveyCreateRequest = z.infer<typeof surveyCreateRequestSchema>;

export const surveyUpdateRequestSchema = z
  .object({ ...surveyShape, revision: z.number().int().min(1) })
  .superRefine(refineSurvey);
export type SurveyUpdateRequest = z.infer<typeof surveyUpdateRequestSchema>;

export const surveyStatusRequestSchema = z.object({
  status: surveyStatusSchema,
  revision: z.number().int().min(1),
});
export type SurveyStatusRequest = z.infer<typeof surveyStatusRequestSchema>;

/** Admin view (`survey:read`). */
export const surveySchema = z.object({
  id: objectIdSchema,
  kind: surveyKindSchema,
  eventId: objectIdSchema.nullable(),
  slug: z.string(),
  title: z.string(),
  intro: z.string(),
  thankYouMessage: z.string(),
  questions: z.array(surveyQuestionSchema),
  settings: surveySettingsSchema,
  status: surveyStatusSchema,
  responseCount: z.number().int(),
  revision: z.number().int(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type SurveyView = z.infer<typeof surveySchema>;

export const surveyListQuerySchema = cursorPageQuerySchema.extend({
  kind: surveyKindSchema.optional(),
  status: surveyStatusSchema.optional(),
  eventId: objectIdSchema.optional(),
});
export type SurveyListQuery = z.infer<typeof surveyListQuerySchema>;

export const surveyListSchema = cursorPageSchema(surveySchema);
export type SurveyList = z.infer<typeof surveyListSchema>;

/** One question's summary; which fields are set depends on its type. */
export const surveyQuestionSummarySchema = z.object({
  questionId: z.uuid(),
  label: z.string(),
  type: surveyQuestionTypeSchema,
  answered: z.number().int(),
  /** Choices: answers per option, in option order. */
  options: z.array(z.object({ id: z.uuid(), label: z.string(), count: z.number().int() })),
  /** Rating and scale: mean, and answers per value. */
  average: z.number().nullable(),
  distribution: z.array(z.object({ value: z.number().int(), count: z.number().int() })),
  /** Scale: % promoters (9–10) minus % detractors (0–6). */
  nps: z.number().int().nullable(),
  /** Text: the latest answers. */
  texts: z.array(z.string()),
});
export type SurveyQuestionSummary = z.infer<typeof surveyQuestionSummarySchema>;

export const surveyResponseRowSchema = z.object({
  id: objectIdSchema,
  submittedAt: isoDateTimeSchema,
  /** Empty on an anonymous survey. */
  name: z.string().nullable(),
  email: z.string().nullable(),
  /** `questionId` → answer as text. */
  answers: z.record(z.string(), z.string()),
});
export type SurveyResponseRow = z.infer<typeof surveyResponseRowSchema>;

export const surveyResultsSchema = z.object({
  total: z.number().int(),
  questions: z.array(surveyQuestionSummarySchema),
  /** The latest responses; everything is in the export. */
  responses: z.array(surveyResponseRowSchema),
});
export type SurveyResults = z.infer<typeof surveyResultsSchema>;

export const SURVEY_EXPORT_FORMATS = ["xlsx", "csv"] as const;
export const surveyExportQuerySchema = z.object({
  format: z.enum(SURVEY_EXPORT_FORMATS).default("xlsx"),
});
export type SurveyExportQuery = z.infer<typeof surveyExportQuerySchema>;

export const PUBLIC_SURVEY_STATES = [
  "open",
  "not_open",
  "closed",
  "full",
  "already_answered",
  "invalid_link",
] as const;
export const publicSurveyStateSchema = z.enum(PUBLIC_SURVEY_STATES);
export type PublicSurveyState = z.infer<typeof publicSurveyStateSchema>;

/** The survey as it is shown: never the event's data, the counters or who answered. */
export const publicSurveySchema = z.object({
  state: publicSurveyStateSchema,
  slug: z.string(),
  title: z.string(),
  intro: z.string(),
  thankYouMessage: z.string(),
  questions: z.array(surveyQuestionSchema),
  collectEmail: z.enum(SURVEY_COLLECT),
  collectName: z.enum(SURVEY_COLLECT),
  consentText: z.string(),
  consentRequired: z.boolean(),
  anonymous: z.boolean(),
  opensAt: isoDateTimeSchema.nullable(),
});
export type PublicSurvey = z.infer<typeof publicSurveySchema>;

export const publicSurveyQuerySchema = z.object({
  t: z.string().min(20).max(200).optional(),
  r: z.uuid().optional(),
});
export type PublicSurveyQuery = z.infer<typeof publicSurveyQuerySchema>;

export const surveyAnswerValueSchema = z.union([
  z.string().trim().max(SURVEY_LIMITS.answerTextMax),
  z.array(z.uuid()).max(SURVEY_LIMITS.optionsMax),
  z.number().int().min(SURVEY_LIMITS.scaleMin).max(SURVEY_LIMITS.scaleMax),
]);
export type SurveyAnswerValue = z.infer<typeof surveyAnswerValueSchema>;

/** `web` → program-service. Rate limited by `clientIp`. */
export const surveySubmitRequestSchema = z.object({
  answers: z.record(z.uuid(), surveyAnswerValueSchema),
  name: z.string().trim().max(SURVEY_LIMITS.nameMax).optional(),
  email: emailSchema.optional(),
  consent: z.boolean().default(false),
  /** Random id kept by the browser: enough to refuse a second answer, identifies nobody. */
  respondentId: z.uuid().optional(),
  /** Share token of a ticket (`?t=`). */
  ticketToken: z.string().min(20).max(200).optional(),
  clientIp: z.string().max(64).optional(),
});
export type SurveySubmitRequest = z.infer<typeof surveySubmitRequestSchema>;

/** The open feedback survey of an ended event, for the ticket pages. */
export const eventFeedbackLinkSchema = z.object({
  slug: z.string().nullable(),
});
export type EventFeedbackLink = z.infer<typeof eventFeedbackLinkSchema>;
