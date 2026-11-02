import type { SurveyQuestion } from "@lavieco/shared/events";

export type DraftAnswer = string | string[] | number;
export type DraftAnswers = Record<string, DraftAnswer>;

const isEmpty = (value: DraftAnswer | undefined) =>
  value === undefined || value === "" || (Array.isArray(value) && value.length === 0);

export const answerableOf = (questions: readonly SurveyQuestion[]) =>
  questions.filter((question) => question.type !== "section");

/** Progress bar: answered questions over all of them, sections not counted. */
export function progressOf(questions: readonly SurveyQuestion[], answers: DraftAnswers) {
  const asked = answerableOf(questions);
  const done = asked.filter((question) => !isEmpty(answers[question.id])).length;
  return { done, total: asked.length, percent: asked.length ? (done / asked.length) * 100 : 0 };
}

/** Required questions still empty, in order: the first one gets focus. */
export function missingRequired(questions: readonly SurveyQuestion[], answers: DraftAnswers) {
  return answerableOf(questions)
    .filter((question) => question.required && isEmpty(answers[question.id]))
    .map((question) => question.id);
}

/** What is sent: no empty answers, and only the questions the survey still has. */
export function answersToSend(questions: readonly SurveyQuestion[], answers: DraftAnswers) {
  return Object.fromEntries(
    answerableOf(questions)
      .filter((question) => !isEmpty(answers[question.id]))
      .map((question) => [question.id, answers[question.id]!]),
  );
}

const DRAFT_PREFIX = "lavieco:khao-sat:";
const RESPONDENT_KEY = "lavieco:khao-sat:nguoi-tra-loi";

export const draftKey = (slug: string, ticketToken: string | null) =>
  `${DRAFT_PREFIX}${slug}:${ticketToken ?? "chung"}`;

/** A saved draft, keeping only well-formed values (the browser's storage is untrusted). */
export function parseDraft(raw: string | null): DraftAnswers {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        ([, item]) =>
          typeof item === "string" ||
          typeof item === "number" ||
          (Array.isArray(item) && item.every((entry) => typeof entry === "string")),
      ),
    ) as DraftAnswers;
  } catch {
    return {};
  }
}

/** A random id per browser: enough to refuse a second answer, identifies nobody. */
export function respondentId(storage: Pick<Storage, "getItem" | "setItem">): string {
  const known = storage.getItem(RESPONDENT_KEY);
  if (known) return known;
  const id = crypto.randomUUID();
  storage.setItem(RESPONDENT_KEY, id);
  return id;
}
