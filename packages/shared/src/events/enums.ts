import { z } from "zod";

/**
 * Event lifecycle (docs/05, ADR-0014, BR-17): no second reviewer, unlike the
 * publishable content pattern. `ended` is final for a standard event.
 */
export const EVENT_STATUSES = ["draft", "published", "closed", "ended"] as const;
export const eventStatusSchema = z.enum(EVENT_STATUSES);
export type EventStatus = z.infer<typeof eventStatusSchema>;

/** Status changes an admin can request; the domain decides which are allowed. */
export const EVENT_ACTIONS = ["publish", "unpublish", "close", "reopen", "end"] as const;
export const eventActionSchema = z.enum(EVENT_ACTIONS);
export type EventAction = z.infer<typeof eventActionSchema>;

/**
 * `standard`: a new event with tickets and a registration form. `past`: an event that
 * happened before the platform existed, recorded for the archive only: no tickets, no
 * form, published straight to `ended`. Fixed at creation.
 */
export const EVENT_KINDS = ["standard", "past"] as const;
export const eventKindSchema = z.enum(EVENT_KINDS);
export type EventKind = z.infer<typeof eventKindSchema>;

/** Online/offline is its own field, independent from the event type (docs/05). */
export const EVENT_FORMATS = ["offline", "online"] as const;
export const eventFormatSchema = z.enum(EVENT_FORMATS);
export type EventFormat = z.infer<typeof eventFormatSchema>;

export const QUESTION_TYPES = [
  "short_text",
  "paragraph",
  "single_choice",
  "multiple_choice",
  "dropdown",
] as const;
export const questionTypeSchema = z.enum(QUESTION_TYPES);
export type QuestionType = z.infer<typeof questionTypeSchema>;

export const CHOICE_QUESTION_TYPES: readonly QuestionType[] = [
  "single_choice",
  "multiple_choice",
  "dropdown",
];

/**
 * Fields every registration form has, rendered by the checkout and never stored as
 * questions. `safety_acknowledgement` is only shown when the event has safety notes.
 * Only the booker is asked for data (BR-13); nothing about children (BR-08).
 */
export const FIXED_REGISTRATION_FIELDS = ["full_name", "email", "phone", "data_consent"] as const;
export const CONDITIONAL_REGISTRATION_FIELDS = ["safety_acknowledgement"] as const;

/** Why an event cannot be published yet (blockers) or should be checked (warnings). */
export const PUBLISH_BLOCKERS = [
  "start_in_past",
  "past_event_not_finished",
  "venue_missing",
  "ticket_type_missing",
  "event_type_archived",
] as const;
export const publishBlockerSchema = z.enum(PUBLISH_BLOCKERS);
export type PublishBlocker = z.infer<typeof publishBlockerSchema>;

export const PUBLISH_WARNINGS = ["online_url_missing", "summary_missing"] as const;
export const publishWarningSchema = z.enum(PUBLISH_WARNINGS);
export type PublishWarning = z.infer<typeof publishWarningSchema>;
