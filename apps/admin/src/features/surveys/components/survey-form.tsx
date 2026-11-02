"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { FiArrowDown, FiArrowUp, FiPlus, FiTrash2 } from "react-icons/fi";

import {
  SURVEY_ACCESSES,
  SURVEY_COLLECT,
  SURVEY_KINDS,
  SURVEY_LIMITS,
  SURVEY_ONE_PER,
  SURVEY_QUESTION_TYPES,
  isSurveyChoice,
  type SurveyView,
} from "@lavieco/shared/events";
import {
  Button,
  CheckboxField,
  FormAlert,
  SelectField,
  TextareaField,
  TextField,
} from "@lavieco/ui";

import { callAction } from "@/shared/call-action";

import { createSurvey, updateSurvey } from "../actions/surveys";
import { TEXT } from "../constants/text";
import {
  emptyValues,
  newQuestion,
  toSurveyRequest,
  valuesOf,
  type EditableQuestion,
  type SurveyFormValues,
} from "../utils/values";

const t = TEXT.vi;
const f = t.form;

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-hairline bg-white p-5 shadow-ambient md:p-7">
      <h2 className="font-display text-xl text-deep-blue">{title}</h2>
      {hint ? <p className="mt-1 text-[12.5px] text-charcoal/65">{hint}</p> : null}
      <div className="mt-5 grid gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

function QuestionEditor({
  question,
  error,
  first,
  last,
  onChange,
  onMove,
  onRemove,
}: {
  question: EditableQuestion;
  error?: string;
  first: boolean;
  last: boolean;
  onChange: (next: EditableQuestion) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  const section = question.type === "section";
  const iconButton =
    "rounded-full p-2 text-deep-blue/70 hover:bg-mint-mist disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <li className="rounded-2xl border border-hairline p-4">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem_auto]">
        <TextField
          tone="light"
          label={section ? f.sectionLabel : f.label}
          value={question.label}
          maxLength={SURVEY_LIMITS.labelMax}
          error={error}
          onChange={(event) => onChange({ ...question, label: event.target.value })}
        />
        <SelectField
          tone="light"
          label={f.type}
          value={question.type}
          options={SURVEY_QUESTION_TYPES.map((value) => ({ value, label: f.types[value] }))}
          onChange={(event) =>
            onChange({ ...question, type: event.target.value as EditableQuestion["type"] })
          }
        />
        <div className="flex items-end gap-1">
          <button
            type="button"
            aria-label={f.moveUp}
            disabled={first}
            className={iconButton}
            onClick={() => onMove(-1)}
          >
            <FiArrowUp aria-hidden="true" size={14} />
          </button>
          <button
            type="button"
            aria-label={f.moveDown}
            disabled={last}
            className={iconButton}
            onClick={() => onMove(1)}
          >
            <FiArrowDown aria-hidden="true" size={14} />
          </button>
          <button type="button" aria-label={f.remove} className={iconButton} onClick={onRemove}>
            <FiTrash2 aria-hidden="true" size={14} />
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <TextField
          tone="light"
          label={f.description}
          value={question.description}
          wrapperClassName="md:col-span-2"
          onChange={(event) => onChange({ ...question, description: event.target.value })}
        />
        {isSurveyChoice(question.type) ? (
          <TextareaField
            tone="light"
            rows={4}
            label={f.options}
            value={question.optionsText}
            wrapperClassName="md:col-span-2"
            onChange={(event) => onChange({ ...question, optionsText: event.target.value })}
          />
        ) : null}
        {question.type === "scale" ? (
          <>
            <TextField
              tone="light"
              label={f.scaleLow}
              value={question.scaleLow}
              onChange={(event) => onChange({ ...question, scaleLow: event.target.value })}
            />
            <TextField
              tone="light"
              label={f.scaleHigh}
              value={question.scaleHigh}
              onChange={(event) => onChange({ ...question, scaleHigh: event.target.value })}
            />
          </>
        ) : null}
        {section ? null : (
          <CheckboxField
            label={f.required}
            checked={question.required}
            onChange={(event) => onChange({ ...question, required: event.target.checked })}
          />
        )}
      </div>
    </li>
  );
}

type SurveyFormProps = {
  survey: SurveyView | null;
  preset?: { eventId: string | null; template: boolean };
  events: { id: string; title: string }[];
  canWrite: boolean;
};

/** Builder of a survey. Saved as a whole; the service protects what was already answered. */
export function SurveyForm({ survey, preset, events, canWrite }: SurveyFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<SurveyFormValues>(() =>
    survey ? valuesOf(survey) : emptyValues(preset ?? { eventId: null, template: false }),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const disabled = busy || !canWrite;

  const set = <K extends keyof SurveyFormValues>(key: K, value: SurveyFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };
  const setSetting = <K extends keyof SurveyFormValues["settings"]>(
    key: K,
    value: SurveyFormValues["settings"][K],
  ) => set("settings", { ...values.settings, [key]: value });

  const question = (at: number, next: EditableQuestion) =>
    set(
      "questions",
      values.questions.map((item, index) => (index === at ? next : item)),
    );
  const move = (at: number, by: -1 | 1) => {
    const next = [...values.questions];
    const [item] = next.splice(at, 1);
    next.splice(at + by, 0, item!);
    set("questions", next);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setAlert(null);
    setErrors({});
    const body = toSurveyRequest(values);
    const result = await callAction(() =>
      survey ? updateSurvey(survey.id, { ...body, revision: survey.revision }) : createSurvey(body),
    );
    setBusy(false);
    if (result.status === "ok") {
      if (survey) {
        setSaved(true);
        router.refresh();
      } else {
        router.push(`/surveys/${result.data.id}`);
      }
      return;
    }
    if (result.status === "invalid") {
      setErrors(result.fieldErrors);
      setAlert(t.errors.invalid);
      return;
    }
    setAlert(t.errors[result.reason]);
  };

  const collectOptions = SURVEY_COLLECT.map((value) => ({ value, label: f.collect[value] }));
  const { settings } = values;

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Group title={f.basics}>
        <SelectField
          tone="light"
          label={f.kind}
          value={values.kind}
          disabled={disabled}
          options={SURVEY_KINDS.map((value) => ({ value, label: t.kind[value] }))}
          onChange={(event) => set("kind", event.target.value as SurveyFormValues["kind"])}
        />
        {values.kind === "event_feedback" ? (
          <SelectField
            tone="light"
            label={f.eventId}
            value={values.eventId}
            disabled={disabled}
            error={errors.eventId}
            options={[
              { value: "", label: f.eventIdPlaceholder },
              ...events.map((item) => ({ value: item.id, label: item.title })),
            ]}
            onChange={(event) => set("eventId", event.target.value)}
          />
        ) : null}
        <TextField
          tone="light"
          label={f.surveyTitle}
          value={values.title}
          maxLength={SURVEY_LIMITS.titleMax}
          error={errors.title}
          disabled={disabled}
          onChange={(event) => set("title", event.target.value)}
        />
        <TextField
          tone="light"
          label={f.slug}
          hint={f.slugHint}
          value={values.slug}
          maxLength={SURVEY_LIMITS.slugMax}
          error={errors.slug}
          disabled={disabled}
          onChange={(event) => set("slug", event.target.value.toLowerCase())}
        />
        <TextareaField
          tone="light"
          rows={3}
          label={f.introLabel}
          value={values.intro}
          wrapperClassName="md:col-span-2"
          disabled={disabled}
          onChange={(event) => set("intro", event.target.value)}
        />
        <TextareaField
          tone="light"
          rows={2}
          label={f.thankYou}
          value={values.thankYouMessage}
          wrapperClassName="md:col-span-2"
          disabled={disabled}
          onChange={(event) => set("thankYouMessage", event.target.value)}
        />
      </Group>

      <Group title={f.questions} hint={f.questionsHint}>
        <ol className="space-y-3 md:col-span-2">
          {values.questions.map((item, index) => (
            <QuestionEditor
              key={item.id}
              question={item}
              error={errors[`questions.${index}.label`] ?? errors[`questions.${index}.options`]}
              first={index === 0}
              last={index === values.questions.length - 1}
              onChange={(next) => question(index, next)}
              onMove={(by) => move(index, by)}
              onRemove={() =>
                set(
                  "questions",
                  values.questions.filter((_, at) => at !== index),
                )
              }
            />
          ))}
        </ol>
        <div className="md:col-span-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => set("questions", [...values.questions, newQuestion()])}
          >
            <FiPlus aria-hidden="true" size={14} />
            {f.add}
          </Button>
        </div>
      </Group>

      <Group title={f.settings}>
        <div className="md:col-span-2">
          <CheckboxField
            label={f.anonymous}
            checked={settings.anonymous}
            disabled={disabled}
            onChange={(event) => setSetting("anonymous", event.target.checked)}
          />
          <p className="mt-1 text-[12px] text-charcoal/60">{f.anonymousHint}</p>
          {errors["settings.anonymous"] ? (
            <p role="alert" className="mt-1 text-[12.5px] font-medium text-error">
              {errors["settings.anonymous"]}
            </p>
          ) : null}
        </div>
        <SelectField
          tone="light"
          label={f.collectEmail}
          value={settings.collectEmail}
          disabled={disabled || settings.anonymous}
          options={collectOptions}
          onChange={(event) =>
            setSetting("collectEmail", event.target.value as typeof settings.collectEmail)
          }
        />
        <SelectField
          tone="light"
          label={f.collectName}
          value={settings.collectName}
          disabled={disabled || settings.anonymous}
          options={collectOptions}
          onChange={(event) =>
            setSetting("collectName", event.target.value as typeof settings.collectName)
          }
        />
        <SelectField
          tone="light"
          label={f.access}
          value={settings.access}
          disabled={disabled}
          error={errors["settings.access"]}
          options={SURVEY_ACCESSES.map((value) => ({ value, label: f.accesses[value] }))}
          onChange={(event) =>
            set("settings", {
              ...settings,
              access: event.target.value as typeof settings.access,
              onePer: event.target.value === "ticket_holders" ? "ticket" : "browser",
            })
          }
        />
        <SelectField
          tone="light"
          label={f.onePer}
          value={settings.onePer}
          disabled={disabled}
          error={errors["settings.onePer"]}
          options={SURVEY_ONE_PER.map((value) => ({ value, label: f.onePers[value] }))}
          onChange={(event) => setSetting("onePer", event.target.value as typeof settings.onePer)}
        />
        <TextField
          tone="light"
          type="datetime-local"
          label={f.opensAt}
          value={settings.opensLocal}
          disabled={disabled}
          onChange={(event) => setSetting("opensLocal", event.target.value)}
        />
        <TextField
          tone="light"
          type="datetime-local"
          label={f.closesAt}
          value={settings.closesLocal}
          disabled={disabled}
          error={errors["settings.closesAt"]}
          onChange={(event) => setSetting("closesLocal", event.target.value)}
        />
        <TextField
          tone="light"
          inputMode="numeric"
          label={f.maxResponses}
          value={settings.maxResponses}
          disabled={disabled}
          error={errors["settings.maxResponses"]}
          onChange={(event) => setSetting("maxResponses", event.target.value)}
        />
        <TextareaField
          tone="light"
          rows={2}
          label={f.consentText}
          hint={f.consentHint}
          value={settings.consentText}
          wrapperClassName="md:col-span-2"
          disabled={disabled}
          onChange={(event) => setSetting("consentText", event.target.value)}
        />
      </Group>

      <FormAlert message={alert} />
      {saved ? (
        <p role="status" className="text-[13px] font-medium text-emerald-ink">
          {f.saved}
        </p>
      ) : null}
      {canWrite ? (
        <Button type="submit" disabled={busy}>
          {busy ? f.saving : f.save}
        </Button>
      ) : null}
    </form>
  );
}
