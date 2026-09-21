"use client";

import { FiArrowRight } from "react-icons/fi";

import { CheckboxField, PearlDot, SelectField, TextareaField, TextField } from "@lavieco/ui";

import { useLeadForm } from "@/shared/hooks/use-lead-form";

import { submitOrganizationLead } from "../actions/submit-organization-lead";
import { INTEREST_VALUES } from "../constants/config";
import { TEXT } from "../constants/text";
import { organizationLeadSchema } from "../schemas";

const INTEREST_OPTIONS = INTEREST_VALUES.map((value) => ({
  value,
  label: TEXT.vi.interests[value],
}));

/** Door 01 of the contact section: schools and businesses. */
export function OrganizationLeadForm() {
  const t = TEXT.vi;
  const { status, errors, handleSubmit } = useLeadForm({
    schema: organizationLeadSchema,
    submit: submitOrganizationLead,
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label={t.fields.name.label}
          name="name"
          autoComplete="name"
          placeholder={t.fields.name.placeholder}
          error={errors.name}
        />
        <TextField
          label={t.fields.organization.label}
          name="organization"
          autoComplete="organization"
          placeholder={t.fields.organization.placeholder}
          error={errors.organization}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      </div>
      <TextareaField
        label={t.fields.message.label}
        name="message"
        rows={2}
        placeholder={t.fields.message.placeholder}
        error={errors.message}
      />
      <CheckboxField label={t.consent} name="consent" value="yes" error={errors.consent} />
      <button
        type="submit"
        disabled={busy}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-brand py-3.5 text-xs font-bold uppercase tracking-museum text-deep-blue shadow-emerald-cta transition-all hover:bg-emerald-brand/90 disabled:opacity-80"
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
