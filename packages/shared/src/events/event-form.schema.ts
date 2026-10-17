import { z } from "zod";

import { CHOICE_QUESTION_TYPES, questionTypeSchema } from "./enums";
import { EVENT_LIMITS } from "./limits";

export const formOptionSchema = z.object({
  /** UUID, immutable: answers reference it. */
  id: z.uuid(),
  label: z.string().trim().min(1).max(200),
});
export type FormOption = z.infer<typeof formOptionSchema>;

/**
 * One custom question of an event's registration form (Google-Form-like builder).
 * `id` never changes once created: answers are keyed by it and still exported
 * after the question is hidden (BR-17).
 */
export const formQuestionSchema = z
  .object({
    id: z.uuid(),
    type: questionTypeSchema,
    label: z.string().trim().min(1).max(300),
    description: z.string().trim().max(500).default(""),
    required: z.boolean(),
    options: z.array(formOptionSchema).max(EVENT_LIMITS.optionsMax).default([]),
    hidden: z.boolean().default(false),
  })
  .superRefine((question, ctx) => {
    const isChoice = CHOICE_QUESTION_TYPES.includes(question.type);
    if (isChoice && question.options.length === 0) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "Choice needs options" });
    }
    if (!isChoice && question.options.length > 0) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "Text question has no options" });
    }
    const ids = new Set(question.options.map((option) => option.id));
    if (ids.size !== question.options.length) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "Duplicate option id" });
    }
  });
export type FormQuestion = z.infer<typeof formQuestionSchema>;

/** Questions in display order. The fixed booker fields are not part of it. */
export const eventFormSchema = z.object({
  questions: z
    .array(formQuestionSchema)
    .max(EVENT_LIMITS.questionsMax)
    .refine((questions) => new Set(questions.map((q) => q.id)).size === questions.length, {
      message: "Duplicate question id",
    }),
});
export type EventForm = z.infer<typeof eventFormSchema>;

export const eventFormUpdateRequestSchema = eventFormSchema.extend({
  revision: z.number().int().min(1),
});
export type EventFormUpdateRequest = z.infer<typeof eventFormUpdateRequestSchema>;
