import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FormAlert, FormErrorNote, RequiredNote, TextField } from "@lavieco/ui";

// Fixture copy (not UI copy of the site).
const COPY = {
  note: "Còn 2 mục cần điền hoặc sửa",
  announce: "Còn 2 mục cần điền",
  name: "Họ & tên",
  nameError: "Vui lòng nhập họ tên.",
  email: "Email",
  busy: "Hệ thống đang bận.",
  required: "Các mục có dấu * là bắt buộc.",
};

describe("shared form feedback (@lavieco/ui)", () => {
  // The visible line is for sighted people at the bottom of the form; screen readers
  // hear the hidden live region once instead of both.
  it("shows the count above the button and announces it in a hidden live region", () => {
    const html = renderToString(<FormErrorNote message={COPY.note} announcement={COPY.announce} />);
    expect(html).toMatch(/role="status" aria-live="polite" class="sr-only">Còn 2 mục cần điền</);
    expect(html).toMatch(/<p aria-hidden="true" class="[^"]*text-error[^"]*">/);
    expect(html).toContain(COPY.note);
    expect(html).not.toMatch(/border|bg-/);
  });

  it("keeps the live region mounted (empty) while nothing is wrong", () => {
    expect(renderToString(<FormErrorNote message={null} announcement={null} />)).toBe(
      '<div role="status" aria-live="polite" class="sr-only"></div>',
    );
  });

  // Dark (Deep Sea) forms use the light error red, never Canary, and always with words.
  it("uses error-on-dark on dark surfaces, never Canary", () => {
    const html = renderToString(
      <>
        <FormErrorNote tone="dark" message={COPY.note} announcement={COPY.announce} />
        <FormAlert surface="dark" message={COPY.busy} />
        <TextField label={COPY.name} error={COPY.nameError} required />
      </>,
    );
    expect(html).toContain("text-error-on-dark");
    expect(html).not.toContain("canary");
    expect(html).toContain(COPY.nameError);
  });

  it("marks a required field with a hidden * and the required attribute", () => {
    const html = renderToString(<TextField tone="light" label={COPY.email} required />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toMatch(/required=""/);
    expect(renderToString(<RequiredNote text={COPY.required} />)).toContain("text-error");
  });
});
