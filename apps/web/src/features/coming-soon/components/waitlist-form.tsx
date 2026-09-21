"use client";

import { useId } from "react";
import { FiAlertCircle, FiCheckCircle } from "react-icons/fi";

import { cn } from "@lavieco/ui";

import { useLeadForm } from "@/shared/hooks/use-lead-form";

import { submitWaitlist } from "../actions/submit-waitlist";
import { TEXT } from "../constants/text";
import { waitlistSchema } from "../schemas";

/** Email sign-up for the launch notice (UC-07): idle → submitting → success | error. */
export function WaitlistForm() {
  const t = TEXT.vi;
  const { status, errors, handleSubmit } = useLeadForm({
    schema: waitlistSchema,
    submit: submitWaitlist,
  });
  const ids = { email: useId(), emailError: useId(), consent: useId(), consentError: useId() };

  const busy = status === "submitting";
  const done = status === "success";
  const failed = status === "unavailable" || status === "invalid";
  const buttonLabel = done ? t.form.done : busy ? t.form.submitting : t.form.submit;

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full max-w-md">
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div
        className={cn(
          "flex flex-col gap-1 rounded-3xl bg-white p-1.5 shadow-ambient-hover transition-shadow sm:flex-row sm:items-center sm:rounded-full",
          "focus-within:ring-2 focus-within:ring-emerald-brand",
          errors.email && "ring-2 ring-canary focus-within:ring-emerald-brand",
        )}
      >
        <label htmlFor={ids.email} className="sr-only">
          {t.form.emailLabel}
        </label>
        <input
          id={ids.email}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t.form.emailPlaceholder}
          disabled={busy || done}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? ids.emailError : undefined}
          className="w-full min-w-0 bg-transparent px-5 py-3 text-[15px] text-charcoal placeholder:text-charcoal/55 focus:outline-none focus-visible:outline-none disabled:opacity-70"
        />
        <button
          type="submit"
          disabled={busy || done}
          className="shrink-0 rounded-full bg-emerald-brand px-7 py-3.5 text-xs font-bold tracking-wider text-deep-blue transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-default disabled:opacity-80 disabled:hover:scale-100 motion-reduce:transition-none"
        >
          {buttonLabel}
        </button>
      </div>
      {errors.email ? (
        <p id={ids.emailError} role="alert" className="mt-2 text-xs text-deep-blue">
          {errors.email}
        </p>
      ) : null}

      <div className="mt-4 flex items-start justify-center gap-2.5 text-left">
        <input
          id={ids.consent}
          name="consent"
          type="checkbox"
          value="yes"
          disabled={busy || done}
          aria-invalid={errors.consent ? true : undefined}
          aria-describedby={errors.consent ? ids.consentError : undefined}
          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-emerald-brand"
        />
        <label htmlFor={ids.consent} className="text-xs leading-relaxed text-charcoal/75">
          {t.form.consent}
        </label>
      </div>
      {errors.consent ? (
        <p id={ids.consentError} role="alert" className="mt-2 text-xs text-deep-blue">
          {errors.consent}
        </p>
      ) : null}

      {/* Always mounted so screen readers announce the change of status. */}
      <div role="status" aria-live="polite" className="mt-3 min-h-5">
        {done ? (
          <p className="inline-flex items-center justify-center gap-1.5 text-[13px] font-medium text-deep-blue">
            <FiCheckCircle aria-hidden="true" size={15} className="text-emerald-brand" />
            {t.status.success}
          </p>
        ) : null}
        {failed ? (
          <p className="inline-flex items-center justify-center gap-1.5 text-[13px] text-deep-blue">
            <FiAlertCircle aria-hidden="true" size={15} />
            {t.status[status]}
          </p>
        ) : null}
      </div>
    </form>
  );
}
