"use client";

import { FiRefreshCw } from "react-icons/fi";

import { FormAlert, type FieldTone } from "@lavieco/ui";

import { FORM_TEXT } from "../constants/form-text";
import type { FormFailure } from "../form-failures";

/** A failed submit, with a reload button when the page is older than the server. */
export function FailureAlert({
  failure,
  surface = "light",
}: {
  failure: FormFailure | null;
  surface?: FieldTone;
}) {
  return (
    <FormAlert tone="error" message={failure?.message ?? null} surface={surface}>
      {failure?.reload ? (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 font-semibold underline underline-offset-2 hover:no-underline"
        >
          <FiRefreshCw aria-hidden="true" size={14} />
          {FORM_TEXT.vi.reload}
        </button>
      ) : null}
    </FormAlert>
  );
}
