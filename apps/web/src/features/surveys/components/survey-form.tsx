"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { FiCheckCircle, FiStar } from "react-icons/fi";

import { SURVEY_LIMITS, type PublicSurvey, type SurveyQuestion } from "@lavieco/shared/events";
import { CheckboxField, FormErrorNote, RequiredNote, TextField, cn, focusField } from "@lavieco/ui";

import { callAction } from "@/shared/call-action";
import { HoneypotField } from "@/shared/components/honeypot-field";

import { submitSurvey } from "../actions/submit";
import { SURVEY_PATHS, TEXT } from "../constants/text";
import {
  answersToSend,
  draftKey,
  missingRequired,
  parseDraft,
  progressOf,
  respondentId,
  type DraftAnswer,
  type DraftAnswers,
} from "../utils/answers";

const t = TEXT.vi;
const fieldId = (key: string) => `khao-sat-${key}`;
const DRAFT_SAVE_MS = 400;

const pill = (active: boolean) =>
  cn(
    "flex min-h-11 min-w-11 items-center justify-center rounded-xl border px-2 text-[15px] font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-brand",
    active
      ? "border-emerald-brand bg-emerald-brand text-charcoal"
      : "border-hairline bg-white text-deep-blue hover:bg-mint-mist",
  );

function QuestionInput({
  question,
  value,
  invalid,
  onChange,
}: {
  question: SurveyQuestion;
  value: DraftAnswer | undefined;
  invalid: boolean;
  onChange: (next: DraftAnswer) => void;
}) {
  const id = fieldId(question.id);
  const base =
    "w-full rounded-2xl border bg-white px-4 py-3 text-[15px] text-charcoal focus-visible:outline-2 focus-visible:outline-emerald-brand";
  const border = invalid ? "border-error" : "border-hairline";
  switch (question.type) {
    case "rating":
      return (
        <div id={id} tabIndex={-1} role="group" className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              aria-label={t.stars(star)}
              aria-pressed={value === star}
              onClick={() => onChange(star)}
              className={cn(
                "flex size-12 items-center justify-center rounded-xl text-emerald-ink hover:bg-mint-mist focus-visible:outline-2 focus-visible:outline-emerald-brand",
              )}
            >
              <FiStar
                aria-hidden="true"
                size={30}
                className={typeof value === "number" && value >= star ? "fill-emerald-brand" : ""}
              />
            </button>
          ))}
        </div>
      );
    case "scale":
      return (
        <div id={id} tabIndex={-1} role="group">
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">
            {Array.from({ length: SURVEY_LIMITS.scaleMax + 1 }, (_, score) => (
              <button
                key={score}
                type="button"
                aria-label={t.scaleValue(score)}
                aria-pressed={value === score}
                onClick={() => onChange(score)}
                className={pill(value === score)}
              >
                {score}
              </button>
            ))}
          </div>
          {question.scaleLow || question.scaleHigh ? (
            <p className="mt-1.5 flex justify-between gap-4 text-[12.5px] text-charcoal/65">
              <span>{question.scaleLow}</span>
              <span className="text-right">{question.scaleHigh}</span>
            </p>
          ) : null}
        </div>
      );
    case "paragraph":
      return (
        <textarea
          id={id}
          rows={4}
          maxLength={SURVEY_LIMITS.answerTextMax}
          value={typeof value === "string" ? value : ""}
          aria-invalid={invalid}
          onChange={(event) => onChange(event.target.value)}
          className={cn(base, border)}
        />
      );
    case "single_choice":
    case "multiple_choice": {
      const many = question.type === "multiple_choice";
      const picked = many ? (Array.isArray(value) ? value : []) : [value];
      return (
        <div id={id} tabIndex={-1} role="group" className="space-y-2">
          {question.options.map((option) => (
            <label
              key={option.id}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-2.5 text-[15px] text-charcoal has-focus-visible:outline-2 has-focus-visible:outline-emerald-brand",
                picked.includes(option.id)
                  ? "border-emerald-brand bg-mint-mist"
                  : "border-hairline bg-white",
              )}
            >
              <input
                type={many ? "checkbox" : "radio"}
                name={id}
                className="accent-emerald-brand"
                checked={picked.includes(option.id)}
                onChange={() => {
                  if (!many) return onChange(option.id);
                  const list = picked as string[];
                  onChange(
                    list.includes(option.id)
                      ? list.filter((item) => item !== option.id)
                      : [...list, option.id],
                  );
                }}
              />
              {option.label}
            </label>
          ))}
        </div>
      );
    }
    case "dropdown":
      return (
        <select
          id={id}
          value={typeof value === "string" ? value : ""}
          aria-invalid={invalid}
          onChange={(event) => onChange(event.target.value)}
          className={cn(base, border)}
        >
          <option value="">{t.choose}</option>
          {question.options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      );
    default:
      return (
        <input
          id={id}
          type="text"
          maxLength={SURVEY_LIMITS.answerTextMax}
          value={typeof value === "string" ? value : ""}
          aria-invalid={invalid}
          onChange={(event) => onChange(event.target.value)}
          className={cn(base, border)}
        />
      );
  }
}

/**
 * The form: mobile first, draft kept in the browser (nothing is stored server-side until
 * it is sent), read from React state because the controls are custom buttons.
 */
export function SurveyForm(props: { survey: PublicSurvey; ticketToken: string | null }) {
  // The server has no draft and the first paint must match it; the form then starts over
  // in the browser, with the draft. Remounting needs no state change in an effect.
  const browser = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  return <SurveyFields key={browser ? "browser" : "server"} browser={browser} {...props} />;
}

const noSubscription = () => () => undefined;

function SurveyFields({
  survey,
  ticketToken,
  browser,
}: {
  survey: PublicSurvey;
  ticketToken: string | null;
  browser: boolean;
}) {
  const storageKey = draftKey(survey.slug, ticketToken);
  const [answers, setAnswers] = useState<DraftAnswers>(() =>
    browser ? parseDraft(window.localStorage.getItem(storageKey)) : {},
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (!browser || sent) return;
    const timer = setTimeout(() => {
      window.localStorage.setItem(storageKey, JSON.stringify(answers));
    }, DRAFT_SAVE_MS);
    return () => clearTimeout(timer);
  }, [answers, browser, sent, storageKey]);

  const progress = useMemo(
    () => progressOf(survey.questions, answers),
    [survey.questions, answers],
  );

  const set = (id: string, value: DraftAnswer) => {
    setAnswers((current) => ({ ...current, [id]: value }));
    setErrors((current) => {
      const { [id]: _gone, ...rest } = current;
      return rest;
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const next: Record<string, string> = {};
    for (const id of missingRequired(survey.questions, answers)) next[id] = t.errors.required;
    if (survey.collectName === "required" && !name) next.name = t.errors.name;
    if (survey.collectEmail === "required" && !email) next.email = t.errors.email;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = t.errors.email;
    if (survey.consentRequired && !consent) next.consent = t.errors.consent;
    setErrors(next);
    setFailure(null);
    const firstInvalid = [
      ...survey.questions.map((question) => question.id),
      "name",
      "email",
      "consent",
    ].find((key) => next[key]);
    if (firstInvalid) {
      focusField(fieldId(firstInvalid));
      return;
    }

    setBusy(true);
    const result = await callAction(() =>
      submitSurvey({
        slug: survey.slug,
        answers: answersToSend(survey.questions, answers),
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
        consent,
        respondentId: respondentId(window.localStorage),
        ...(ticketToken ? { ticketToken } : {}),
        website: String(form.get("website") ?? "") || undefined,
      }),
    );
    setBusy(false);
    if (result.status === "ok") {
      window.localStorage.removeItem(storageKey);
      setSent(true);
      window.scrollTo({ top: 0 });
      return;
    }
    setFailure(t.errors[result.reason]);
  };

  if (sent) {
    return (
      <div className="rounded-pedestal bg-mint-mist p-6 text-center md:p-10">
        <FiCheckCircle aria-hidden="true" size={36} className="mx-auto text-emerald-ink" />
        <h2 className="mt-3 font-display text-headline-sm text-deep-blue">{t.thanks.title}</h2>
        <p className="mt-2 whitespace-pre-line text-body-md text-charcoal/80">
          {survey.thankYouMessage || t.thanks.body}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href={SURVEY_PATHS.programs}
            className="inline-flex rounded-full bg-emerald-brand px-5 py-2.5 text-sm font-bold text-charcoal"
          >
            {t.thanks.programs}
          </Link>
          <Link
            href={SURVEY_PATHS.agent}
            className="inline-flex rounded-full border border-hairline bg-white px-5 py-2.5 text-sm font-semibold text-deep-blue"
          >
            {t.thanks.agent}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <div className="sticky top-dock-clearance z-10 rounded-2xl bg-soft-white/95 py-2 backdrop-blur">
        <p className="mb-1 text-[12.5px] text-charcoal/70">
          {t.progress(progress.done, progress.total)}
        </p>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.done}
          className="h-1.5 overflow-hidden rounded-full bg-mint-mist"
        >
          <div
            className="h-full rounded-full bg-emerald-brand transition-[width] motion-reduce:transition-none"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>
      <RequiredNote text={t.required} />
      {survey.anonymous ? <p className="text-body-sm text-charcoal/75">{t.anonymous}</p> : null}
      {survey.questions.map((question) =>
        question.type === "section" ? (
          <div key={question.id} className="pt-4">
            <h2 className="font-display text-headline-sm text-deep-blue">{question.label}</h2>
            {question.description ? (
              <p className="mt-1 text-body-sm text-charcoal/75">{question.description}</p>
            ) : null}
          </div>
        ) : (
          <div key={question.id} className="space-y-2">
            <label htmlFor={fieldId(question.id)} className="block">
              <span className="text-[15.5px] font-semibold text-deep-blue">
                {question.label}
                {question.required ? (
                  <span aria-hidden="true" className="text-error">
                    {" "}
                    *
                  </span>
                ) : null}
              </span>
              {question.description ? (
                <span className="mt-0.5 block text-body-sm text-charcoal/70">
                  {question.description}
                </span>
              ) : null}
            </label>
            <QuestionInput
              question={question}
              value={answers[question.id]}
              invalid={Boolean(errors[question.id])}
              onChange={(value) => set(question.id, value)}
            />
            {errors[question.id] ? (
              <FormErrorNote message={errors[question.id]!} announcement={errors[question.id]!} />
            ) : null}
          </div>
        ),
      )}
      {survey.collectName !== "off" ? (
        <TextField
          tone="light"
          id={fieldId("name")}
          name="name"
          label={t.name}
          required={survey.collectName === "required"}
          maxLength={SURVEY_LIMITS.nameMax}
          error={errors.name}
        />
      ) : null}
      {survey.collectEmail !== "off" ? (
        <TextField
          tone="light"
          id={fieldId("email")}
          name="email"
          type="email"
          label={t.email}
          required={survey.collectEmail === "required"}
          error={errors.email}
        />
      ) : null}
      {survey.consentRequired ? (
        <div id={fieldId("consent")} tabIndex={-1}>
          <CheckboxField
            label={survey.consentText || t.consentDefault}
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
          />
          {errors.consent ? (
            <FormErrorNote message={errors.consent} announcement={errors.consent} />
          ) : null}
        </div>
      ) : null}
      <HoneypotField />
      {failure ? <FormErrorNote message={failure} announcement={failure} /> : null}
      <button
        type="submit"
        disabled={busy}
        className="min-h-12 w-full rounded-full bg-emerald-brand px-6 py-3 text-sm font-bold text-charcoal shadow-emerald-cta disabled:opacity-60"
      >
        {busy ? t.sending : t.submit}
      </button>
      <p className="text-center text-[12.5px] text-charcoal/60">{t.draftKept}</p>
    </form>
  );
}
