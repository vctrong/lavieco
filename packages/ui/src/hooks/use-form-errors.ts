"use client";

import { useCallback, useState } from "react";

export type FormErrors = Record<string, string>;

/** Room kept above a field: the fixed dock (`--spacing-dock-clearance`) + its label. */
function topClearance(): number {
  const root = getComputedStyle(document.documentElement);
  const rem = parseFloat(root.fontSize) || 16;
  const dock = parseFloat(root.getPropertyValue("--spacing-dock-clearance")) || 5.75;
  return (dock + 2.5) * rem;
}

/**
 * Moves to a field and focuses it: scrolls smoothly (instantly under reduced motion)
 * so the field and its label sit just below the sticky dock instead of under it.
 */
export function focusField(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({
    top: Math.max(0, element.getBoundingClientRect().top + window.scrollY - topClearance()),
    behavior: reduced ? "auto" : "smooth",
  });
  element.focus({ preventScroll: true });
}

type UseFormErrorsOptions = {
  /** Field keys from the top of the form: the first invalid one gets focus. */
  fieldOrder: readonly string[];
  /** DOM id of a field control (or of its group), to move focus there. */
  fieldId: (key: string) => string;
  /**
   * Errors of the current values, for forms whose values live in React state: once the
   * form was submitted they are shown as they change. Forms read from the DOM call
   * `revalidate` from their change and blur events instead.
   */
  live?: FormErrors;
  /**
   * True while the form is being sent. Its controls are disabled then, and disabled
   * controls are left out of FormData: a blur at that moment would read every field as
   * missing. Re-checks wait until the answer is back.
   */
  paused?: boolean;
};

/**
 * One way for every form to report what is wrong (docs/04 §5.5): nothing is flagged
 * before the first submit; that submit lists every invalid field and focuses the first;
 * afterwards each field is checked again as it changes, so an error goes as soon as it
 * is fixed. Errors returned by the server stay on their field until it is edited.
 */
export function useFormErrors({ fieldOrder, fieldId, live, paused = false }: UseFormErrorsOptions) {
  const [submitted, setSubmitted] = useState(false);
  const [checked, setChecked] = useState<FormErrors>({});
  const [server, setServer] = useState<FormErrors>({});

  const clientErrors = submitted ? (live ?? checked) : {};
  const errors: FormErrors = { ...server, ...clientErrors };
  const invalidFields = fieldOrder.filter((key) => errors[key]);

  const focusFirst = useCallback(
    (found: FormErrors) => {
      const first = fieldOrder.find((key) => found[key]);
      if (first) focusField(fieldId(first));
    },
    [fieldOrder, fieldId],
  );

  /**
   * On submit: shows the errors found and focuses the first. True when there are none.
   * A new submit also drops the previous answer's field errors.
   */
  const check = (found: FormErrors): boolean => {
    setSubmitted(true);
    setServer({});
    setChecked(found);
    if (Object.keys(found).length === 0) return true;
    focusFirst(found);
    return false;
  };

  /** After the first submit, from the form's change and blur events. */
  const revalidate = (found: FormErrors) => {
    if (submitted && !paused) setChecked(found);
  };

  /** Errors the server reported per field; the first one gets focus. */
  const showServerErrors = (found: FormErrors) => {
    setServer(found);
    focusFirst(found);
  };

  /** An edit drops the server's error for that field; the live check takes over. */
  const clearServerError = (key: string) =>
    setServer((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });

  const reset = () => {
    setSubmitted(false);
    setChecked({});
    setServer({});
  };

  return {
    errors,
    invalidFields,
    check,
    revalidate,
    showServerErrors,
    clearServerError,
    reset,
  };
}
