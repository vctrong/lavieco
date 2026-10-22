"use client";

import { FiAlertCircle, FiArrowRight } from "react-icons/fi";

import {
  BusyLabel,
  CheckboxField,
  FormErrorNote,
  PearlDot,
  RequiredNote,
  SelectField,
  TextField,
} from "@lavieco/ui";

import { FailureAlert } from "@/shared/components/failure-alert";
import { HoneypotField } from "@/shared/components/honeypot-field";
import { FORM_TEXT } from "@/shared/constants/form-text";
import { useLeadForm } from "@/shared/hooks/use-lead-form";

import { submitGiftRequest } from "../actions/submit-gift-request";
import { INTEREST_VALUES } from "../constants/config";
import { TEXT } from "../constants/text";
import { giftRequestSchema } from "../schemas";

const INTEREST_OPTIONS = INTEREST_VALUES.map((value) => ({
  value,
  label: TEXT.vi.interests[value],
}));

const FIELD_ORDER = ["name", "phone", "interest", "consent"];
const fieldId = (key: string) => `loi-nhan-${key}`;

/** Door 02 of the contact section: individuals (Deep Sea surface). */
export function GiftRequestForm() {
  const t = TEXT.vi;
  const f = FORM_TEXT.vi;
  const { status, failure, errors, invalidFields, formProps } = useLeadForm({
    schema: giftRequestSchema,
    submit: submitGiftRequest,
    fieldOrder: FIELD_ORDER,
    fieldId,
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
    <form {...formProps} className="space-y-4">
      <HoneypotField />
      <RequiredNote tone="dark" text={f.requiredNote} />
      <TextField
        id={fieldId("name")}
        label={t.fields.name.label}
        name="name"
        autoComplete="name"
        required
        placeholder={t.fields.name.placeholder}
        error={errors.name}
      />
      <TextField
        id={fieldId("phone")}
        label={t.fields.phone.label}
        name="phone"
        type="tel"
        autoComplete="tel"
        required
        placeholder={t.fields.phone.placeholder}
        error={errors.phone}
      />
      <SelectField
        id={fieldId("interest")}
        label={t.fields.interest.label}
        name="interest"
        required
        options={INTEREST_OPTIONS}
        defaultValue={INTEREST_VALUES[0]}
        error={errors.interest}
      />
      <CheckboxField
        id={fieldId("consent")}
        label={t.consent}
        name="consent"
        value="yes"
        required
        error={errors.consent}
      />
      <FormErrorNote
        announcement={invalidFields.length > 0 ? f.announce(invalidFields.length) : null}
        tone="dark"
        message={invalidFields.length > 0 ? f.aboveSubmit(invalidFields.length) : null}
      />
      <FailureAlert surface="dark" failure={failure} />
      <button
        type="submit"
        disabled={busy}
        aria-busy={busy}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-brand py-3.5 text-xs font-bold uppercase tracking-museum text-deep-blue shadow-emerald-cta transition-all hover:bg-emerald-brand/90 disabled:opacity-80"
      >
        <span className="inline-flex items-center gap-2">
          <BusyLabel busy={busy} idle={t.submit} sending={t.submitting} />
        </span>
        <PearlDot size="sm" />
        <FiArrowRight aria-hidden="true" size={14} />
      </button>
      <div role="status" aria-live="polite">
        {status === "unavailable" || status === "invalid" ? (
          <p className="flex items-start gap-2 text-xs leading-relaxed text-error-on-dark">
            <FiAlertCircle aria-hidden="true" size={14} className="mt-px shrink-0" />
            {t.status[status]}
          </p>
        ) : null}
      </div>
    </form>
  );
}
