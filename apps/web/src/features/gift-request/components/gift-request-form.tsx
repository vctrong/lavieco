"use client";

import { FiArrowRight } from "react-icons/fi";

import { CheckboxField, PearlDot, SelectField, TextField } from "@lavieco/ui";

import { useLeadForm } from "@/shared/hooks/use-lead-form";

import { submitGiftRequest } from "../actions/submit-gift-request";
import { INTEREST_VALUES } from "../constants/config";
import { TEXT } from "../constants/text";
import { giftRequestSchema } from "../schemas";

const INTEREST_OPTIONS = INTEREST_VALUES.map((value) => ({
  value,
  label: TEXT.vi.interests[value],
}));

/** Door 02 of the contact section: individuals. */
export function GiftRequestForm() {
  const t = TEXT.vi;
  const { status, errors, handleSubmit } = useLeadForm({
    schema: giftRequestSchema,
    submit: submitGiftRequest,
  });
  const busy = status === "submitting";

  if (status === "success") {
    return (
      <p role="status" className="text-sm text-mint-mist">
        {t.status.success}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <TextField
        label={t.fields.name.label}
        name="name"
        autoComplete="name"
        placeholder={t.fields.name.placeholder}
        error={errors.name}
      />
      <TextField
        label={t.fields.phone.label}
        name="phone"
        type="tel"
        autoComplete="tel"
        placeholder={t.fields.phone.placeholder}
        error={errors.phone}
      />
      <SelectField
        label={t.fields.interest.label}
        name="interest"
        options={INTEREST_OPTIONS}
        defaultValue={INTEREST_VALUES[0]}
        error={errors.interest}
      />
      <CheckboxField label={t.consent} name="consent" value="yes" error={errors.consent} />
      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-brand py-3.5 text-xs font-bold uppercase tracking-museum text-deep-blue shadow-emerald-cta transition-all hover:bg-emerald-brand/90 disabled:opacity-80"
      >
        <span>{busy ? t.submitting : t.submit}</span>
        <PearlDot size="sm" />
        <FiArrowRight aria-hidden="true" size={14} />
      </button>
      {status === "unavailable" || status === "invalid" ? (
        <p role="status" className="text-xs leading-relaxed text-canary">
          {t.status[status]}
        </p>
      ) : null}
    </form>
  );
}
