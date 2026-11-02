import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { SurveyQuestion } from "@lavieco/shared/events";

import { validateAnswers } from "../../orders";
import {
  assertCanOpen,
  assertSurveyChangeAllowed,
  consentRequired,
  netPromoterScore,
  summarize,
  surveyStateOf,
  validateSurveyAnswers,
  type SurveyRecord,
} from "./survey";

const question = (overrides: Partial<SurveyQuestion> = {}): SurveyQuestion => ({
  id: randomUUID(),
  type: "short_text",
  label: "Câu hỏi",
  description: "",
  required: false,
  options: [],
  scaleLow: "",
  scaleHigh: "",
  ...overrides,
});

const NOW = new Date("2026-11-02T00:00:00Z");
const settings: SurveyRecord["settings"] = {
  anonymous: false,
  collectEmail: "off",
  collectName: "off",
  access: "public_link",
  onePer: "browser",
  opensAt: null,
  closesAt: null,
  maxResponses: null,
  consentText: "",
};

const check = (questions: SurveyQuestion[], answers: Record<string, never> | object) =>
  validateSurveyAnswers(questions, answers as never, validateAnswers);

describe("validateSurveyAnswers", () => {
  it("accepts stars 1–5 and the scale 0–10, whole numbers only", () => {
    const stars = question({ type: "rating" });
    const nps = question({ type: "scale" });
    expect(check([stars, nps], { [stars.id]: 5, [nps.id]: 0 })).toEqual([
      { questionId: stars.id, value: 5 },
      { questionId: nps.id, value: 0 },
    ]);
    for (const bad of [0, 6, 2.5, "3"]) {
      expect(() => check([stars], { [stars.id]: bad })).toThrow("survey.answers_invalid");
    }
    expect(() => check([nps], { [nps.id]: 11 })).toThrow("survey.answers_invalid");
  });

  it("requires what is required, and drops empty optional answers", () => {
    const stars = question({ type: "rating", required: true });
    expect(() => check([stars], {})).toThrow("survey.answers_invalid");
    const text = question({ required: false });
    expect(check([text], { [text.id]: "  " })).toEqual([]);
  });

  it("uses the registration form's rules for choices", () => {
    const id = randomUUID();
    const choice = question({
      type: "single_choice",
      options: [{ id, label: "Có" }],
      required: true,
    });
    expect(check([choice], { [choice.id]: id })).toEqual([{ questionId: choice.id, value: id }]);
    expect(() => check([choice], { [choice.id]: randomUUID() })).toThrow();
  });

  it("refuses unknown questions and an answer to a section heading", () => {
    const heading = question({ type: "section" });
    expect(() => check([heading], { [heading.id]: "x" })).toThrow("survey.answers_invalid");
    expect(() => check([heading], { [randomUUID()]: "x" })).toThrow("survey.answers_invalid");
  });
});

describe("surveyStateOf", () => {
  const base = { status: "open" as const, settings, responseCount: 0 };

  it("follows the status, the window and the response limit", () => {
    expect(surveyStateOf(base, NOW)).toBe("open");
    expect(surveyStateOf({ ...base, status: "closed" }, NOW)).toBe("closed");
    expect(surveyStateOf({ ...base, settings: { ...settings, closesAt: NOW } }, NOW)).toBe(
      "closed",
    );
    const later = new Date(NOW.getTime() + 1000);
    expect(surveyStateOf({ ...base, settings: { ...settings, opensAt: later } }, NOW)).toBe(
      "not_open",
    );
    expect(
      surveyStateOf({ ...base, responseCount: 3, settings: { ...settings, maxResponses: 3 } }, NOW),
    ).toBe("full");
  });
});

describe("rules", () => {
  it("asks for consent whenever personal data is collected (BR-06)", () => {
    expect(consentRequired(settings)).toBe(false);
    expect(consentRequired({ ...settings, collectEmail: "optional" })).toBe(true);
    expect(consentRequired({ ...settings, consentText: "Tôi đồng ý." })).toBe(true);
  });

  it("will not open a survey with nothing to answer", () => {
    expect(() => assertCanOpen({ questions: [question({ type: "section" })] })).toThrow(
      "survey.no_questions",
    );
    expect(() => assertCanOpen({ questions: [question()] })).not.toThrow();
  });

  it("freezes questions and anonymity once people answered", () => {
    const kept = question();
    const current = {
      kind: "standalone",
      questions: [kept],
      settings,
      responseCount: 1,
    } as SurveyRecord;
    const next = { kind: "standalone", questions: [kept], settings } as Parameters<
      typeof assertSurveyChangeAllowed
    >[1];
    expect(() => assertSurveyChangeAllowed(current, next)).not.toThrow();
    expect(() => assertSurveyChangeAllowed(current, { ...next, questions: [] })).toThrow(
      "survey.locked",
    );
    expect(() =>
      assertSurveyChangeAllowed(current, {
        ...next,
        questions: [{ ...kept, type: "paragraph" }],
      }),
    ).toThrow("survey.locked");
    expect(() =>
      assertSurveyChangeAllowed(current, { ...next, settings: { ...settings, anonymous: true } }),
    ).toThrow("survey.locked");
    expect(() =>
      assertSurveyChangeAllowed({ ...current, responseCount: 0 }, { ...next, questions: [] }),
    ).not.toThrow();
  });
});

describe("results", () => {
  it("computes the NPS from promoters and detractors", () => {
    expect(netPromoterScore([])).toBeNull();
    expect(netPromoterScore([10, 9, 8, 6])).toBe(25);
    expect(netPromoterScore([0, 0])).toBe(-100);
  });

  it("summarises each type", () => {
    const yes = randomUUID();
    const no = randomUUID();
    const stars = question({ type: "rating" });
    const nps = question({ type: "scale" });
    const choice = question({
      type: "multiple_choice",
      options: [
        { id: yes, label: "Có" },
        { id: no, label: "Không" },
      ],
    });
    const text = question();
    const [starsSummary, npsSummary, choiceSummary, textSummary] = summarize(
      [question({ type: "section" }), stars, nps, choice, text],
      [
        {
          answers: [
            { questionId: stars.id, value: 5 },
            { questionId: nps.id, value: 10 },
            { questionId: choice.id, value: [yes] },
            { questionId: text.id, value: "Rất vui" },
          ],
        },
        {
          answers: [
            { questionId: stars.id, value: 4 },
            { questionId: nps.id, value: 3 },
            { questionId: choice.id, value: [yes, no] },
          ],
        },
      ],
    );
    expect(starsSummary).toMatchObject({ answered: 2, average: 4.5 });
    expect(starsSummary!.distribution).toHaveLength(5);
    expect(npsSummary).toMatchObject({ average: 6.5, nps: 0 });
    expect(npsSummary!.distribution).toHaveLength(11);
    expect(choiceSummary!.options.map((option) => option.count)).toEqual([2, 1]);
    expect(textSummary!.texts).toEqual(["Rất vui"]);
  });
});
