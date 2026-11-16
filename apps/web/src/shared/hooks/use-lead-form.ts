"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { z } from "zod";

import { useFormErrors } from "@lavieco/ui";

import { callAction } from "../call-action";
import { usePublicDraft } from "../drafts";
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
  /** Name of the draft kept in this tab while the form is being filled. */
  draftForm: string;
};

/** Never part of a draft: consent is a fresh click (BR-06); the rest is per submit. */
const NOT_DRAFTED = new Set(["consent", "website", "turnstileToken", "cf-turnstile-response"]);

function draftableValues(form: HTMLFormElement): Record<string, string> {
  return Object.fromEntries(
    Object.entries(valuesOf(form)).filter(([key]) => !NOT_DRAFTED.has(key)),
  );
}

/** Puts drafted values back into the (uncontrolled) fields. */
function fillForm(form: HTMLFormElement, values: Record<string, string>) {
  for (const [name, value] of Object.entries(values)) {
    const field = form.elements.namedItem(name);
    if (
      field instanceof HTMLInputElement ||
      field instanceof HTMLTextAreaElement ||
      field instanceof HTMLSelectElement
    ) {
      field.value = value;
    }
  }
}

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
  draftForm,
}: UseLeadFormOptions<TSchema>) {
  const [status, setStatus] = useState<LeadFormStatus>("idle");
  // The call itself failed (page out of date, offline): shown instead of `status`.
  const [failure, setFailure] = useState<FormFailure | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const form = useFormErrors({ fieldOrder, fieldId, paused: status === "submitting" });
  const formRef = useRef<HTMLFormElement>(null);
  const [typed, setTyped] = useState<Record<string, string>>({});

  // A failed submit, a reload ("Tải lại trang" after a deploy) or a dropped connection
  // keeps what was typed, for this tab only.
  const draft = usePublicDraft<Record<string, string>>({
    form: draftForm,
    record: "new",
    values: typed,
    dirty: status !== "success" && Object.values(typed).some((value) => value.trim() !== ""),
    onRestore: useCallback((values: Record<string, string>) => {
      if (formRef.current) fillForm(formRef.current, values);
      setTyped(values);
    }, []),
  });

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

  const recheck = (event: FormEvent<HTMLFormElement>) => {
    form.revalidate(errorsOf(event.currentTarget));
    setTyped(draftableValues(event.currentTarget));
  };

  /** "Xoá và nhập lại". */
  const forgetDraft = () => {
    draft.forget();
    formRef.current?.reset();
    setTyped({});
  };

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
    if (outcome.status === "success") draft.clear();
    setStatus(outcome.status);
  };

  return {
    status,
    failure,
    errors: form.errors,
    invalidFields: form.invalidFields,
    draftRestored: draft.restored,
    forgetDraft,
    formProps: {
      ref: formRef,
      onSubmit: handleSubmit,
      onChange: recheck,
      onBlur: recheck,
      noValidate: true,
    },
  };
}
