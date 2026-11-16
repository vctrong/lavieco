// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { mimicBrowserFormData } from "@/shared/testing/dom";

import { useLeadForm, type LeadSubmitOutcome } from "./use-lead-form";

vi.mock("next/navigation", () => ({ unstable_isUnrecognizedActionError: () => false }));

const submit = vi.fn<() => Promise<LeadSubmitOutcome>>();
const schema = z.object({
  name: z.string().min(1),
  message: z.string(),
  consent: z.literal("yes"),
});

function LeadForm() {
  const { formProps, draftRestored, status } = useLeadForm({
    schema,
    submit,
    fieldOrder: ["name", "message", "consent"],
    fieldId: (key) => `f-${key}`,
    draftForm: "spec",
  });
  return (
    <form {...formProps}>
      {draftRestored ? <p id="restored">restored</p> : null}
      {status === "success" ? <p id="done">done</p> : null}
      <input id="f-name" name="name" />
      <textarea id="f-message" name="message" />
      <input id="f-consent" type="checkbox" name="consent" value="yes" />
      <button type="submit">send</button>
    </form>
  );
}

let root: Root;
let container: HTMLElement;

/** Everything kept in this tab's sessionStorage, as one string. */
const storedText = () =>
  Array.from({ length: sessionStorage.length }, (_, index) =>
    sessionStorage.getItem(sessionStorage.key(index) ?? ""),
  ).join("");

const $ = <T extends Element>(selector: string) => container.querySelector<T>(selector)!;

async function mount() {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<LeadForm />));
  await act(async () => {});
}

async function type(selector: string, value: string) {
  const field = $<HTMLInputElement | HTMLTextAreaElement>(selector);
  // The prototype's setter, as a keystroke would: React ignores a plain `.value =`.
  const proto = Object.getPrototypeOf(field) as HTMLInputElement;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(field, value);
  await act(async () => {
    field.dispatchEvent(new Event("change", { bubbles: true }));
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(() => {
  mimicBrowserFormData();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  sessionStorage.clear();
  submit.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe("useLeadForm drafts", () => {
  it("puts typed values back after a reload, but never the consent", async () => {
    await mount();
    await type("#f-name", "Trường Tiểu học A");
    await type("#f-message", "Một lời nhắn dài");
    $<HTMLInputElement>("#f-consent").checked = true;
    await type("#f-consent", "yes");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    const stored = storedText();
    expect(stored).toContain("Trường Tiểu học A");
    expect(stored).not.toContain("consent");

    // Reload: a fresh mount of the same form in the same tab.
    act(() => root.unmount());
    container.remove();
    await mount();

    expect($<HTMLInputElement>("#f-name").value).toBe("Trường Tiểu học A");
    expect($<HTMLTextAreaElement>("#f-message").value).toBe("Một lời nhắn dài");
    expect($<HTMLInputElement>("#f-consent").checked).toBe(false);
    expect($("#restored")).not.toBeNull();
  });

  it("keeps the draft when the submit fails, and drops it once accepted", async () => {
    await mount();
    await type("#f-name", "Công ty B");
    $<HTMLInputElement>("#f-consent").checked = true;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    submit.mockResolvedValueOnce({ status: "unavailable" });
    await act(async () => $<HTMLButtonElement>("button").click());
    expect(storedText()).toContain("Công ty B");

    submit.mockResolvedValueOnce({ status: "success" });
    await act(async () => $<HTMLButtonElement>("button").click());
    await act(async () => {});
    expect($("#done")).not.toBeNull();
    expect(storedText()).not.toContain("Công ty B");
  });
});
