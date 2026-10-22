/**
 * Helpers for component tests under happy-dom (test files only).
 *
 * happy-dom keeps disabled controls in FormData; browsers and the HTML spec leave them
 * out. Forms disable their controls while sending, so tests mimic the browser.
 */
export function mimicBrowserFormData() {
  const NativeFormData = globalThis.FormData;
  class SpecFormData extends NativeFormData {
    constructor(form?: HTMLFormElement) {
      super(form);
      for (const element of Array.from(form?.elements ?? [])) {
        const control = element as HTMLInputElement;
        if (control.name && control.disabled) this.delete(control.name);
      }
    }
  }
  globalThis.FormData = SpecFormData as typeof FormData;
  // Tell React this is a test environment that wraps updates in act().
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
}

/** What a browser autofill does: the value is there, no input/change event fired. */
export function autofill(input: HTMLInputElement, value: string) {
  input.value = value;
}
