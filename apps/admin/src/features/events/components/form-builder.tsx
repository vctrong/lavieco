"use client";

import { useRouter } from "next/navigation";
import { useState, type DragEvent } from "react";
import { FiArrowDown, FiArrowUp, FiLock, FiMenu, FiPlus, FiTrash2, FiX } from "react-icons/fi";

import {
  CHOICE_QUESTION_TYPES,
  CONDITIONAL_REGISTRATION_FIELDS,
  EVENT_LIMITS,
  FIXED_REGISTRATION_FIELDS,
  QUESTION_TYPES,
  eventFormUpdateRequestSchema,
  type EventView,
  type FormQuestion,
  type QuestionType,
} from "@lavieco/shared/events";
import { Button, CheckboxField, SelectField, TextField, cn } from "@lavieco/ui";

import { updateEventForm } from "../actions/events";
import { TEXT } from "../constants/text";
import { fieldErrorsOf } from "../schemas";
import { EditorSection } from "./editor-section";
import { FormAlert } from "./form-alert";

const isChoice = (type: QuestionType) => CHOICE_QUESTION_TYPES.includes(type);

function move<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

function FixedFields({ withSafety }: { withSafety: boolean }) {
  const t = TEXT.vi.form;
  const fields = [
    ...FIXED_REGISTRATION_FIELDS,
    ...(withSafety ? CONDITIONAL_REGISTRATION_FIELDS : []),
  ];
  return (
    <div className="mb-6">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-museum text-deep-blue/70">
        {t.fixedTitle}
      </p>
      <ul className="flex flex-wrap gap-2">
        {fields.map((field) => (
          <li
            key={field}
            className="flex items-center gap-1.5 rounded-full border border-hairline bg-soft-white px-3 py-1.5 text-[12.5px] text-deep-blue/80"
          >
            <FiLock aria-label={t.locked} size={12} />
            {t.fixed[field]}
          </li>
        ))}
      </ul>
    </div>
  );
}

type QuestionCardProps = {
  question: FormQuestion;
  index: number;
  count: number;
  /** Existed when people registered: no removal, no type change, no option removal (BR-17). */
  locked: boolean;
  lockedOptionIds: ReadonlySet<string>;
  errors: Record<string, string>;
  disabled: boolean;
  onChange: (question: FormQuestion) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
  dragProps: {
    draggable: boolean;
    onDragStart: (event: DragEvent) => void;
    onDragOver: (event: DragEvent) => void;
    onDrop: (event: DragEvent) => void;
  };
};

function QuestionCard({
  question,
  index,
  count,
  locked,
  lockedOptionIds,
  errors,
  disabled,
  onChange,
  onMove,
  onRemove,
  dragProps,
}: QuestionCardProps) {
  const t = TEXT.vi.form;
  const prefix = `questions.${index}`;
  const set = <K extends keyof FormQuestion>(key: K, value: FormQuestion[K]) =>
    onChange({ ...question, [key]: value });

  const changeType = (type: QuestionType) =>
    onChange({
      ...question,
      type,
      options: isChoice(type)
        ? question.options.length > 0
          ? question.options
          : [{ id: crypto.randomUUID(), label: "" }]
        : [],
    });

  return (
    <li
      {...dragProps}
      className={cn(
        "rounded-2xl border border-hairline bg-white p-4",
        question.hidden && "bg-soft-white opacity-80",
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-museum text-deep-blue/60">
          <span title={t.dragHandle} className="cursor-grab text-deep-blue/40">
            <FiMenu aria-hidden="true" size={15} />
          </span>
          {index + 1}. {t.types[question.type]}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={`${t.moveUp}: ${question.label || t.newQuestion}`}
            disabled={disabled || index === 0}
            onClick={() => onMove(index - 1)}
            className="flex size-8 items-center justify-center rounded-full text-deep-blue/70 hover:bg-mint-mist disabled:opacity-30"
          >
            <FiArrowUp aria-hidden="true" size={14} />
          </button>
          <button
            type="button"
            aria-label={`${t.moveDown}: ${question.label || t.newQuestion}`}
            disabled={disabled || index === count - 1}
            onClick={() => onMove(index + 1)}
            className="flex size-8 items-center justify-center rounded-full text-deep-blue/70 hover:bg-mint-mist disabled:opacity-30"
          >
            <FiArrowDown aria-hidden="true" size={14} />
          </button>
          <button
            type="button"
            aria-label={`${t.remove}: ${question.label || t.newQuestion}`}
            disabled={disabled || locked}
            onClick={onRemove}
            className="flex size-8 items-center justify-center rounded-full text-deep-blue/70 hover:bg-mint-mist disabled:opacity-30"
          >
            <FiTrash2 aria-hidden="true" size={14} />
          </button>
        </div>
      </div>
      {locked ? (
        <p className="mb-3 flex items-center gap-2 text-[12px] text-deep-blue/70">
          <FiLock aria-hidden="true" size={12} />
          {t.lockedQuestion}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <TextField
          tone="light"
          label={t.label}
          value={question.label}
          onChange={(e) => set("label", e.target.value)}
          error={errors[`${prefix}.label`]}
          disabled={disabled}
        />
        <SelectField
          tone="light"
          label={t.type}
          value={question.type}
          options={QUESTION_TYPES.map((type) => ({ value: type, label: t.types[type] }))}
          onChange={(e) => changeType(e.target.value as QuestionType)}
          disabled={disabled || locked}
        />
        <TextField
          tone="light"
          label={t.description}
          value={question.description}
          onChange={(e) => set("description", e.target.value)}
          disabled={disabled}
          wrapperClassName="md:col-span-2"
        />
      </div>
      {isChoice(question.type) ? (
        <fieldset className="mt-4">
          <legend className="mb-2 text-[11px] font-medium uppercase tracking-museum text-deep-blue/70">
            {t.options}
          </legend>
          <ul className="space-y-2">
            {question.options.map((option, optionIndex) => (
              <li key={option.id} className="flex items-center gap-2">
                <input
                  aria-label={t.optionPlaceholder(optionIndex + 1)}
                  placeholder={t.optionPlaceholder(optionIndex + 1)}
                  value={option.label}
                  disabled={disabled}
                  onChange={(e) =>
                    set(
                      "options",
                      question.options.map((item) =>
                        item.id === option.id ? { ...item, label: e.target.value } : item,
                      ),
                    )
                  }
                  className="w-full rounded-full border border-hairline bg-white px-4 py-2 text-sm text-charcoal focus:border-emerald-brand focus:outline-none"
                />
                <button
                  type="button"
                  aria-label={`${t.removeOption} ${optionIndex + 1}`}
                  disabled={
                    disabled || lockedOptionIds.has(option.id) || question.options.length === 1
                  }
                  onClick={() =>
                    set(
                      "options",
                      question.options.filter((item) => item.id !== option.id),
                    )
                  }
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-deep-blue/60 hover:bg-mint-mist disabled:opacity-30"
                >
                  <FiX aria-hidden="true" size={14} />
                </button>
              </li>
            ))}
          </ul>
          {errors[`${prefix}.options`] ? (
            <p role="alert" className="mt-1.5 text-xs text-deep-blue">
              {errors[`${prefix}.options`]}
            </p>
          ) : null}
          {question.options.length < EVENT_LIMITS.optionsMax ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                set("options", [...question.options, { id: crypto.randomUUID(), label: "" }])
              }
              className="mt-2 flex items-center gap-1.5 text-[12.5px] font-medium text-deep-blue hover:text-emerald-brand"
            >
              <FiPlus aria-hidden="true" size={13} />
              {t.addOption}
            </button>
          ) : null}
        </fieldset>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-6">
        <CheckboxField
          tone="light"
          label={t.required}
          checked={question.required}
          disabled={disabled}
          onChange={(e) => set("required", e.target.checked)}
        />
        <CheckboxField
          tone="light"
          label={t.hidden}
          checked={question.hidden}
          disabled={disabled}
          onChange={(e) => set("hidden", e.target.checked)}
        />
      </div>
    </li>
  );
}

/**
 * Section 8: Google-Form-like builder. Reorder by drag and drop, or with the arrow
 * buttons (keyboard). The four booker fields are fixed; safety confirmation only
 * appears when the event has safety notes.
 */
export function FormBuilder({ event, canWrite }: { event: EventView; canWrite: boolean }) {
  const t = TEXT.vi;
  const router = useRouter();
  const [questions, setQuestions] = useState<FormQuestion[]>(() =>
    event.form.questions.map((question) => ({ ...question, options: [...question.options] })),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<{ tone: "error" | "success"; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const disabled = busy || !canWrite;

  const lockedIds = new Set(event.hasRegistrations ? event.form.questions.map((q) => q.id) : []);
  const lockedOptionIds = new Set(
    event.hasRegistrations ? event.form.questions.flatMap((q) => q.options.map((o) => o.id)) : [],
  );

  if (event.kind === "past") {
    return (
      <EditorSection id="form-dang-ky" index={8} title={t.editor.sections.form}>
        <p className="rounded-2xl bg-soft-white px-4 py-3 text-[13px] text-charcoal/70">
          {t.form.pastEvent}
        </p>
      </EditorSection>
    );
  }

  const update = (next: FormQuestion[]) => {
    setQuestions(next);
    setAlert(null);
  };

  const save = async () => {
    if (busy || !canWrite) return;
    const input = { revision: event.revision, questions };
    const parsed = eventFormUpdateRequestSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(fieldErrorsOf(parsed.error));
      setAlert({ tone: "error", message: t.errors.invalid });
      return;
    }
    setErrors({});
    setBusy(true);
    const result = await updateEventForm(event.id, input).catch(() => null);
    setBusy(false);
    if (result?.status === "ok") {
      setAlert({ tone: "success", message: t.editor.saved });
      router.refresh();
      return;
    }
    if (result?.status === "invalid") setErrors(result.fieldErrors);
    setAlert({
      tone: "error",
      message: result?.status === "error" ? t.errors[result.reason] : t.errors.unavailable,
    });
  };

  const addQuestion = () =>
    update([
      ...questions,
      {
        id: crypto.randomUUID(),
        type: "short_text",
        label: "",
        description: "",
        required: false,
        options: [],
        hidden: false,
      },
    ]);

  return (
    <EditorSection
      id="form-dang-ky"
      index={8}
      title={t.editor.sections.form}
      hint={t.editor.sections.formHint}
    >
      <FixedFields withSafety={event.safetyNotes.trim().length > 0} />
      <p className="mb-3 text-[11px] font-medium uppercase tracking-museum text-deep-blue/70">
        {t.form.customTitle}
      </p>
      {questions.length === 0 ? (
        <p className="mb-4 text-[13px] text-charcoal/60">{t.form.empty}</p>
      ) : (
        <ol className="mb-4 space-y-3">
          {questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={index}
              count={questions.length}
              locked={lockedIds.has(question.id)}
              lockedOptionIds={lockedOptionIds}
              errors={errors}
              disabled={disabled}
              onChange={(next) => update(questions.map((q) => (q.id === next.id ? next : q)))}
              onMove={(to) => update(move(questions, index, to))}
              onRemove={() => update(questions.filter((q) => q.id !== question.id))}
              dragProps={{
                draggable: !disabled,
                onDragStart: () => setDragFrom(index),
                onDragOver: (dragEvent) => dragEvent.preventDefault(),
                onDrop: (dragEvent) => {
                  dragEvent.preventDefault();
                  if (dragFrom !== null) update(move(questions, dragFrom, index));
                  setDragFrom(null);
                },
              }}
            />
          ))}
        </ol>
      )}
      {canWrite ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {questions.length < EVENT_LIMITS.questionsMax ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addQuestion}
              disabled={disabled}
            >
              <FiPlus aria-hidden="true" size={14} />
              {t.form.add}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            <FormAlert message={alert?.message ?? null} tone={alert?.tone} />
            <Button
              type="button"
              size="sm"
              onClick={save}
              disabled={busy}
              className="disabled:opacity-70"
            >
              {busy ? t.editor.saving : t.form.save}
            </Button>
          </div>
        </div>
      ) : null}
    </EditorSection>
  );
}
