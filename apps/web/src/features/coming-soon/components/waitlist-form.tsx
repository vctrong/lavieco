"use client";

import { FiAlertCircle, FiCheckCircle } from "react-icons/fi";

import { BusyLabel, FieldError, FormErrorNote, RequiredNote, cn } from "@lavieco/ui";

import { FailureAlert } from "@/shared/components/failure-alert";
import { HoneypotField } from "@/shared/components/honeypot-field";
import { FORM_TEXT } from "@/shared/constants/form-text";
import { useLeadForm } from "@/shared/hooks/use-lead-form";

import { submitWaitlist } from "../actions/submit-waitlist";
import { TEXT } from "../constants/text";
import { waitlistSchema } from "../schemas";

const FIELD_ORDER = ["email", "consent"];
const fieldId = (key: string) => `danh-sach-cho-${key}`;

/** Email sign-up for the launch notice (UC-07): idle → submitting → success | error. */
export function WaitlistForm() {
  const t = TEXT.vi;
  const f = FORM_TEXT.vi;
  const { status, failure, errors, invalidFields, formProps } = useLeadForm({
    schema: waitlistSchema,
    submit: submitWaitlist,
    fieldOrder: FIELD_ORDER,
    fieldId,
  });
  const errorId = (key: string) => `${fieldId(key)}-error`;

  const busy = status === "submitting";
  const done = status === "success";
  const failed = status === "unavailable" || status === "invalid";

  return (
    <form {...formProps} className="w-full max-w-md space-y-3">
      <HoneypotField />
      <RequiredNote text={f.requiredNote} />

      <div>
        <div
          className={cn(
            "flex flex-col gap-1 rounded-3xl bg-white p-1.5 shadow-ambient-hover transition-shadow sm:flex-row sm:items-center sm:rounded-full",
            "focus-within:ring-2 focus-within:ring-emerald-brand",
            errors.email && "ring-2 ring-error focus-within:ring-emerald-brand",
          )}
        >
          <label htmlFor={fieldId("email")} className="sr-only">
            {t.form.emailLabel}
          </label>
          <input
            id={fieldId("email")}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder={t.form.emailPlaceholder}
            disabled={busy || done}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? errorId("email") : undefined}
            className="w-full min-w-0 bg-transparent px-5 py-3 text-[15px] text-charcoal placeholder:text-charcoal/55 focus:outline-none focus-visible:outline-none disabled:opacity-70"
          />
          <button
            type="submit"
            disabled={busy || done}
            aria-busy={busy}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-emerald-brand px-7 py-3.5 text-xs font-bold tracking-wider text-deep-blue transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-default disabled:opacity-80 disabled:hover:scale-100 motion-reduce:transition-none"
          >
            {done ? (
              t.form.done
            ) : (
              <BusyLabel busy={busy} idle={t.form.submit} sending={t.form.submitting} />
            )}
          </button>
        </div>
        {errors.email ? <FieldError id={errorId("email")} message={errors.email} /> : null}
      </div>

      <div>
        <div className="flex items-start justify-center gap-2.5 text-left">
          <input
            id={fieldId("consent")}
            name="consent"
            type="checkbox"
            value="yes"
            required
            disabled={busy || done}
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={errors.consent ? errorId("consent") : undefined}
            className="mt-0.5 size-4 shrink-0 cursor-pointer accent-emerald-brand aria-[invalid=true]:outline-2 aria-[invalid=true]:outline-error"
          />
          <label htmlFor={fieldId("consent")} className="text-xs leading-relaxed text-charcoal/75">
            {t.form.consent}
            <span aria-hidden="true" className="ml-0.5 text-error">
              *
            </span>
          </label>
        </div>
        {errors.consent ? <FieldError id={errorId("consent")} message={errors.consent} /> : null}
      </div>

      <FormErrorNote
        message={invalidFields.length > 0 ? f.aboveSubmit(invalidFields.length) : null}
        announcement={invalidFields.length > 0 ? f.announce(invalidFields.length) : null}
      />
      <FailureAlert failure={failure} />
      {/* Always mounted so screen readers announce the change of status. */}
      <div role="status" aria-live="polite" className="min-h-5">
        {done ? (
          <p className="inline-flex items-center justify-center gap-1.5 text-[13px] font-medium text-deep-blue">
            <FiCheckCircle aria-hidden="true" size={15} className="text-emerald-brand" />
            {t.status.success}
          </p>
        ) : null}
        {failed ? (
          <p className="inline-flex items-center justify-center gap-1.5 text-[13px] text-error">
            <FiAlertCircle aria-hidden="true" size={15} />
            {t.status[status]}
          </p>
        ) : null}
      </div>
    </form>
  );
}
