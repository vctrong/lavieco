"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { z } from "zod";

import { useFormErrors } from "@lavieco/ui";

import { callAction } from "../call-action";
import "../zod-vi";
import { commonFailureMessage, type FormFailure } from "../form-failures";

export type LeadFormStatus = "idle" | "submitting" | "success" | "unavailable" | "invalid";

/** What a submit action reports back. Never `success` until lead-service really accepted it. */
export type LeadSubmitOutcome = { status: "success" | "unavailable" | "invalid" };

type UseLeadFormOptions<TSchema extends z.ZodType<object>> = {
  schema: TSchema;
  submit: (payload: z.output<TSchema> & { idempotencyKey: string }) => Promise<LeadSubmitOutcome>;
  /** Field keys from the top of the form (error summary order, first focus). */
  fieldOrder: readonly string[];
  fieldId: (key: string) => string;
};

/** String values of a form, as the schema reads them. */
function valuesOf(form: HTMLFormElement): Record<string, string> {
  const values: Record<string, string> = {};
  new FormData(form).forEach((value, key) => {
    if (typeof value === "string") values[key] = value;
  });
  return values;
}

/**
 * Shared form behaviour for lead forms: Zod validation on the client (UX; the server
 * action validates again) reported the site-wide way (`useFormErrors`: summary, focus,
 * re-check as fields change), an Idempotency-Key generated when the form mounts, and
 * one submission state. docs/04 §5.5.
 */
export function useLeadForm<TSchema extends z.ZodType<object>>({
  schema,
  submit,
  fieldOrder,
  fieldId,
}: UseLeadFormOptions<TSchema>) {
  const [status, setStatus] = useState<LeadFormStatus>("idle");
  // The call itself failed (page out of date, offline): shown instead of `status`.
  const [failure, setFailure] = useState<FormFailure | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const form = useFormErrors({ fieldOrder, fieldId, paused: status === "submitting" });

  useEffect(() => {
    idempotencyKey.current = crypto.randomUUID();
  }, []);

  const errorsOf = (element: HTMLFormElement) => {
    const parsed = schema.safeParse(valuesOf(element));
    const found: Record<string, string> = {};
    if (parsed.success) return found;
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "");
      if (field && !found[field]) found[field] = issue.message;
    }
    return found;
  };

  const recheck = (event: FormEvent<HTMLFormElement>) =>
    form.revalidate(errorsOf(event.currentTarget));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "submitting") return;
    setFailure(null);
    if (!form.check(errorsOf(event.currentTarget))) {
      setStatus("idle");
      return;
    }
    const parsed = schema.safeParse(valuesOf(event.currentTarget));
    if (!parsed.success) return;

    setStatus("submitting");
    const outcome = await callAction(() =>
      submit({ ...parsed.data, idempotencyKey: idempotencyKey.current ?? crypto.randomUUID() }),
    );
    if (outcome.status === "error") {
      setStatus("idle");
      setFailure({
        message: commonFailureMessage(outcome.reason),
        reload: outcome.reason === "stale_version",
      });
      return;
    }
    setStatus(outcome.status);
  };

  return {
    status,
    failure,
    errors: form.errors,
    invalidFields: form.invalidFields,
    formProps: { onSubmit: handleSubmit, onChange: recheck, onBlur: recheck, noValidate: true },
  };
}
