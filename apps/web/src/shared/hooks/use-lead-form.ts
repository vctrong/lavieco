"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { z } from "zod";

export type LeadFormStatus = "idle" | "submitting" | "success" | "unavailable" | "invalid";

/** What a submit action reports back. Never `success` until lead-service really accepted it. */
export type LeadSubmitOutcome = { status: "success" | "unavailable" | "invalid" };

type UseLeadFormOptions<TSchema extends z.ZodType<object>> = {
  schema: TSchema;
  submit: (payload: z.output<TSchema> & { idempotencyKey: string }) => Promise<LeadSubmitOutcome>;
};

/**
 * Shared form behaviour for lead forms: Zod validation on the client (UX; the
 * server action validates again), an Idempotency-Key generated when the form
 * mounts, and one submission state. docs/04 §5.5.
 */
export function useLeadForm<TSchema extends z.ZodType<object>>({
  schema,
  submit,
}: UseLeadFormOptions<TSchema>) {
  const [status, setStatus] = useState<LeadFormStatus>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const idempotencyKey = useRef<string | null>(null);

  useEffect(() => {
    idempotencyKey.current = crypto.randomUUID();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "submitting") return;

    const values: Record<string, string> = {};
    new FormData(event.currentTarget).forEach((value, key) => {
      if (typeof value === "string") values[key] = value;
    });

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "");
        if (field && !next[field]) next[field] = issue.message;
      }
      setErrors(next);
      setStatus("idle");
      return;
    }

    setErrors({});
    setStatus("submitting");
    try {
      const outcome = await submit({
        ...parsed.data,
        idempotencyKey: idempotencyKey.current ?? crypto.randomUUID(),
      });
      setStatus(outcome.status);
    } catch {
      setStatus("unavailable");
    }
  };

  return { status, errors, handleSubmit };
}
