import { describe, expect, it } from "vitest";

import { surveyCreateRequestSchema } from "@lavieco/shared/events";

import { emptyValues, feedbackTemplate, newQuestion, toSurveyRequest } from "./values";

const EVENT = "e".repeat(24);

describe("survey form values", () => {
  it("builds the six-question feedback template, valid as it is", () => {
    const values = emptyValues({ eventId: EVENT, template: true });
    expect(values.questions).toHaveLength(6);
    expect(values.settings).toMatchObject({ access: "ticket_holders", onePer: "ticket" });
    const parsed = surveyCreateRequestSchema.safeParse(
      toSurveyRequest({ ...values, slug: "cam-nhan-workshop" }),
    );
    expect(parsed.success).toBe(true);
    expect(feedbackTemplate().map((question) => question.type)).toEqual([
      "rating",
      "scale",
      "paragraph",
      "paragraph",
      "single_choice",
      "paragraph",
    ]);
  });

  it("keeps a choice's id when it is reworded, and drops empty lines", () => {
    const question = { ...newQuestion("single_choice"), label: "Chọn" };
    const first = toSurveyRequest({
      ...emptyValues({ eventId: null, template: false }),
      questions: [{ ...question, optionsText: "Có\n\nKhông" }],
    }).questions[0]!;
    expect(first.options.map((option) => option.label)).toEqual(["Có", "Không"]);
    const second = toSurveyRequest({
      ...emptyValues({ eventId: null, template: false }),
      questions: [{ ...question, options: first.options, optionsText: "Có chứ\nKhông" }],
    }).questions[0]!;
    expect(second.options[0]!.id).toBe(first.options[0]!.id);
    expect(second.options[0]!.label).toBe("Có chứ");
  });

  it("refuses contradicting settings", () => {
    const base = { ...emptyValues({ eventId: null, template: true }), slug: "khao-sat" };
    const anonymousWithEmail = toSurveyRequest({
      ...base,
      settings: { ...base.settings, anonymous: true, collectEmail: "required" },
    });
    expect(surveyCreateRequestSchema.safeParse(anonymousWithEmail).success).toBe(false);
    const oneEmailWithout = toSurveyRequest({
      ...base,
      settings: { ...base.settings, onePer: "email" },
    });
    expect(surveyCreateRequestSchema.safeParse(oneEmailWithout).success).toBe(false);
    const standaloneTickets = toSurveyRequest({
      ...base,
      settings: { ...base.settings, access: "ticket_holders", onePer: "ticket" },
    });
    expect(surveyCreateRequestSchema.safeParse(standaloneTickets).success).toBe(false);
  });
});
