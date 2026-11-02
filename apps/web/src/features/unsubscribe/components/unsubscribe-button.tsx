"use client";

import { useState } from "react";

import { callAction } from "@/shared/call-action";

import { unsubscribe } from "../actions/unsubscribe";
import { TEXT } from "../constants/text";

const t = TEXT.vi;

export function UnsubscribeButton({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "failed">("idle");
  const press = async () => {
    setState("busy");
    const result = await callAction(() => unsubscribe(token));
    setState(result.status === "ok" ? "done" : "failed");
  };
  if (state === "done") {
    return (
      <p role="status" className="rounded-2xl bg-mint-mist p-4 text-body-md text-deep-blue">
        {t.done}
      </p>
    );
  }
  return (
    <>
      <button
        type="button"
        disabled={state === "busy"}
        onClick={press}
        className="inline-flex rounded-full bg-deep-blue px-6 py-3 text-sm font-bold text-soft-white disabled:opacity-60"
      >
        {state === "busy" ? t.working : t.confirm}
      </button>
      {state === "failed" ? (
        <p role="alert" className="mt-3 text-body-sm font-medium text-error">
          {t.failed}
        </p>
      ) : null}
    </>
  );
}
