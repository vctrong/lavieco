import {
  isSurveyChoice,
  type SurveyQuestion,
  type SurveySettings,
  type SurveyView,
} from "@lavieco/shared/events";

import { TEXT } from "../constants/text";

export type EditableQuestion = SurveyQuestion & {
  /** The options as typed, one per line; ids are kept by position. */
  optionsText: string;
};

export type SurveyFormValues = {
  kind: SurveyView["kind"];
  eventId: string;
  slug: string;
  title: string;
  intro: string;
  thankYouMessage: string;
  questions: EditableQuestion[];
  settings: Omit<SurveySettings, "opensAt" | "closesAt" | "maxResponses"> & {
    opensLocal: string;
    closesLocal: string;
    maxResponses: string;
  };
};

const VN_OFFSET_MS = 7 * 3_600_000;
export const isoToLocal = (iso: string | null) =>
  iso ? new Date(Date.parse(iso) + VN_OFFSET_MS).toISOString().slice(0, 16) : "";
const localToIso = (local: string) =>
  local ? new Date(Date.parse(`${local}:00Z`) - VN_OFFSET_MS).toISOString() : null;

const editable = (question: SurveyQuestion): EditableQuestion => ({
  ...question,
  optionsText: question.options.map((option) => option.label).join("\n"),
});

export function newQuestion(type: SurveyQuestion["type"] = "short_text"): EditableQuestion {
  return editable({
    id: crypto.randomUUID(),
    type,
    label: "",
    description: "",
    required: false,
    options: [],
    scaleLow: "",
    scaleHigh: "",
  });
}

const choice = (label: string) => ({ id: crypto.randomUUID(), label });

/** "Feedback workshop": the plan's six questions. */
export function feedbackTemplate(): EditableQuestion[] {
  const t = TEXT.vi.template;
  const base = { description: "", options: [], scaleLow: "", scaleHigh: "", required: false };
  const questions: SurveyQuestion[] = [
    { ...base, id: crypto.randomUUID(), type: "rating", label: t.overall, required: true },
    {
      ...base,
      id: crypto.randomUUID(),
      type: "scale",
      label: t.recommend,
      scaleLow: t.recommendLow,
      scaleHigh: t.recommendHigh,
      required: true,
    },
    { ...base, id: crypto.randomUUID(), type: "paragraph", label: t.liked },
    { ...base, id: crypto.randomUUID(), type: "paragraph", label: t.improve },
    {
      ...base,
      id: crypto.randomUUID(),
      type: "single_choice",
      label: t.again,
      options: [choice(t.yes), choice(t.maybe), choice(t.no)],
    },
    { ...base, id: crypto.randomUUID(), type: "paragraph", label: t.free },
  ];
  return questions.map(editable);
}

export function emptyValues(options: { eventId: string | null; template: boolean }) {
  const t = TEXT.vi.template;
  const feedback = options.eventId !== null;
  const values: SurveyFormValues = {
    kind: feedback ? "event_feedback" : "standalone",
    eventId: options.eventId ?? "",
    slug: "",
    title: options.template ? t.title : "",
    intro: options.template ? t.intro : "",
    thankYouMessage: options.template ? t.thankYou : "",
    questions: options.template ? feedbackTemplate() : [newQuestion()],
    settings: {
      anonymous: false,
      collectEmail: "off",
      collectName: "off",
      access: feedback ? "ticket_holders" : "public_link",
      onePer: feedback ? "ticket" : "browser",
      opensLocal: "",
      closesLocal: "",
      maxResponses: "",
      consentText: "",
    },
  };
  return values;
}

export function valuesOf(survey: SurveyView): SurveyFormValues {
  const { opensAt, closesAt, maxResponses, ...settings } = survey.settings;
  return {
    kind: survey.kind,
    eventId: survey.eventId ?? "",
    slug: survey.slug,
    title: survey.title,
    intro: survey.intro,
    thankYouMessage: survey.thankYouMessage,
    questions: survey.questions.map(editable),
    settings: {
      ...settings,
      opensLocal: isoToLocal(opensAt),
      closesLocal: isoToLocal(closesAt),
      maxResponses: maxResponses === null ? "" : String(maxResponses),
    },
  };
}

function optionsOf(question: EditableQuestion) {
  if (!isSurveyChoice(question.type)) return [];
  return question.optionsText
    .split("\n")
    .map((label) => label.trim())
    .filter(Boolean)
    .map((label, index) => ({
      // By position, so rewording a choice keeps the answers already given to it.
      id: question.options[index]?.id ?? crypto.randomUUID(),
      label,
    }));
}

export function toSurveyRequest(values: SurveyFormValues) {
  const { opensLocal, closesLocal, maxResponses, ...settings } = values.settings;
  const limit = maxResponses.trim();
  return {
    kind: values.kind,
    eventId: values.kind === "event_feedback" && values.eventId ? values.eventId : null,
    slug: values.slug,
    title: values.title,
    intro: values.intro,
    thankYouMessage: values.thankYouMessage,
    questions: values.questions.map(({ optionsText: _text, ...question }) => ({
      ...question,
      required: question.type === "section" ? false : question.required,
      options: optionsOf({ ...question, optionsText: _text }),
    })),
    settings: {
      ...settings,
      opensAt: localToIso(opensLocal),
      closesAt: localToIso(closesLocal),
      maxResponses: limit === "" ? null : /^\d+$/.test(limit) ? Number(limit) : Number.NaN,
    },
  };
}
