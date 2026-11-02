import { DomainError } from "@lavieco/shared";
import {
  SURVEY_LIMITS,
  isSurveyChoice,
  type FormQuestion,
  type PublicSurveyState,
  type SurveyAnswerValue,
  type SurveyCreateRequest,
  type SurveyKind,
  type SurveyQuestion,
  type SurveyQuestionSummary,
  type SurveySettings,
  type SurveyStatus,
} from "@lavieco/shared/events";

/** `surveys` (docs/03 §9.2, ADR-0025). */
export type SurveyRecord = {
  id: string;
  kind: SurveyKind;
  eventId: string | null;
  slug: string;
  title: string;
  intro: string;
  thankYouMessage: string;
  questions: SurveyQuestion[];
  settings: Omit<SurveySettings, "opensAt" | "closesAt"> & {
    opensAt: Date | null;
    closesAt: Date | null;
  };
  status: SurveyStatus;
  responseCount: number;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
};

export type SurveyChanges = Omit<
  SurveyRecord,
  "id" | "status" | "responseCount" | "revision" | "createdAt" | "updatedAt"
>;

export function toSurveyChanges(input: SurveyCreateRequest): SurveyChanges {
  return {
    kind: input.kind,
    eventId: input.kind === "event_feedback" ? input.eventId : null,
    slug: input.slug,
    title: input.title,
    intro: input.intro,
    thankYouMessage: input.thankYouMessage,
    questions: input.questions,
    settings: {
      ...input.settings,
      opensAt: input.settings.opensAt ? new Date(input.settings.opensAt) : null,
      closesAt: input.settings.closesAt ? new Date(input.settings.closesAt) : null,
    },
  };
}

export const answerable = (questions: readonly SurveyQuestion[]) =>
  questions.filter((question) => question.type !== "section");

/** Once answered, questions may be added or reworded; removing would orphan answers. */
export function assertSurveyChangeAllowed(current: SurveyRecord, next: SurveyChanges): void {
  if (current.responseCount === 0) return;
  const nextById = new Map(next.questions.map((question) => [question.id, question]));
  for (const before of current.questions) {
    const after = nextById.get(before.id);
    if (!after || after.type !== before.type) throw new DomainError("survey.locked");
    const options = new Set(after.options.map((option) => option.id));
    if (before.options.some((option) => !options.has(option.id))) {
      throw new DomainError("survey.locked");
    }
  }
  if (next.kind !== current.kind || next.settings.anonymous !== current.settings.anonymous) {
    // People answered under these terms: anonymity is a promise.
    throw new DomainError("survey.locked");
  }
}

export function assertCanOpen(survey: Pick<SurveyRecord, "questions">): void {
  if (answerable(survey.questions).length === 0) throw new DomainError("survey.no_questions");
}

/** Whether people can answer now. Reading the answers of one person comes after. */
export function surveyStateOf(
  survey: Pick<SurveyRecord, "status" | "settings" | "responseCount">,
  now: Date,
): PublicSurveyState {
  const { opensAt, closesAt, maxResponses } = survey.settings;
  if (survey.status === "closed") return "closed";
  if (closesAt && closesAt <= now) return "closed";
  if (opensAt && opensAt > now) return "not_open";
  if (maxResponses !== null && survey.responseCount >= maxResponses) return "full";
  return "open";
}

/** BR-06: personal data, or a text the team wrote to be agreed to, needs the tick. */
export const consentRequired = (settings: SurveyRecord["settings"]) =>
  settings.collectEmail !== "off" ||
  settings.collectName !== "off" ||
  settings.consentText.trim().length > 0;

export type SurveyAnswer = { questionId: string; value: string | string[] | number };

const refuse = (why: string): never => {
  throw new DomainError("survey.answers_invalid", why);
};

/**
 * Checks answers against the questions: `base` is the registration form's own check, for
 * the types they share; stars and the scale are whole numbers in range; a section takes
 * no answer. Returns them in question order; empty optional answers are dropped.
 */
export function validateSurveyAnswers(
  questions: readonly SurveyQuestion[],
  answers: Readonly<Record<string, SurveyAnswerValue>>,
  base: (
    questions: readonly FormQuestion[],
    answers: Readonly<Record<string, string | string[]>>,
  ) => { questionId: string; value: string | string[] }[],
): SurveyAnswer[] {
  const shown = answerable(questions);
  const known = new Set(shown.map((question) => question.id));
  if (Object.keys(answers).some((id) => !known.has(id))) refuse("unknown question");
  const result: SurveyAnswer[] = [];
  for (const question of shown) {
    const raw = answers[question.id];
    if (question.type === "rating" || question.type === "scale") {
      const [min, max] =
        question.type === "rating"
          ? [SURVEY_LIMITS.ratingMin, SURVEY_LIMITS.ratingMax]
          : [SURVEY_LIMITS.scaleMin, SURVEY_LIMITS.scaleMax];
      if (raw === undefined || raw === "") {
        if (question.required) refuse("required");
        continue;
      }
      if (typeof raw !== "number" || !Number.isInteger(raw) || raw < min || raw > max) {
        refuse("number out of range");
      }
      result.push({ questionId: question.id, value: raw as number });
      continue;
    }
    if (typeof raw === "number") refuse("number not expected");
    const asForm: FormQuestion = {
      id: question.id,
      type: question.type as FormQuestion["type"],
      label: question.label,
      description: question.description,
      required: question.required,
      options: question.options,
      hidden: false,
    };
    const checked = base([asForm], raw === undefined ? {} : { [question.id]: raw as string });
    result.push(...checked);
  }
  return result;
}

/** Text of one answer for the results and the exports. */
export function answerLabel(question: SurveyQuestion | undefined, answer: SurveyAnswer): string {
  if (typeof answer.value === "number") return String(answer.value);
  const ids = Array.isArray(answer.value) ? answer.value : [answer.value];
  if (!question || !isSurveyChoice(question.type)) return ids.join(", ");
  const labels = new Map(question.options.map((option) => [option.id, option.label]));
  return ids.map((id) => labels.get(id) ?? id).join(", ");
}

const TEXTS_SHOWN = 50;

/** % promoters (9–10) minus % detractors (0–6), rounded; null without answers. */
export function netPromoterScore(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const promoters = values.filter((value) => value >= 9).length;
  const detractors = values.filter((value) => value <= 6).length;
  return Math.round(((promoters - detractors) / values.length) * 100);
}

/** One summary per answerable question. `responses` come newest first. */
export function summarize(
  questions: readonly SurveyQuestion[],
  responses: readonly { answers: readonly SurveyAnswer[] }[],
): SurveyQuestionSummary[] {
  return answerable(questions).map((question) => {
    const given = responses.flatMap((response) =>
      response.answers.filter((answer) => answer.questionId === question.id),
    );
    const numbers = given
      .map((answer) => answer.value)
      .filter((value): value is number => typeof value === "number");
    const summary: SurveyQuestionSummary = {
      questionId: question.id,
      label: question.label,
      type: question.type,
      answered: given.length,
      options: [],
      average: null,
      distribution: [],
      nps: null,
      texts: [],
    };
    if (isSurveyChoice(question.type)) {
      summary.options = question.options.map((option) => ({
        id: option.id,
        label: option.label,
        count: given.filter((answer) =>
          Array.isArray(answer.value)
            ? answer.value.includes(option.id)
            : answer.value === option.id,
        ).length,
      }));
    } else if (question.type === "rating" || question.type === "scale") {
      const rating = question.type === "rating";
      const min = rating ? SURVEY_LIMITS.ratingMin : SURVEY_LIMITS.scaleMin;
      const max = rating ? SURVEY_LIMITS.ratingMax : SURVEY_LIMITS.scaleMax;
      summary.average = numbers.length
        ? Math.round((numbers.reduce((sum, value) => sum + value, 0) / numbers.length) * 100) / 100
        : null;
      summary.distribution = Array.from({ length: max - min + 1 }, (_, index) => ({
        value: min + index,
        count: numbers.filter((value) => value === min + index).length,
      }));
      if (!rating) summary.nps = netPromoterScore(numbers);
    } else {
      summary.texts = given.slice(0, TEXTS_SHOWN).map((answer) => String(answer.value));
    }
    return summary;
  });
}
