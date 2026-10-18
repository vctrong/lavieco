import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HoneypotField } from "./honeypot-field";

describe("HoneypotField", () => {
  // Chrome once autofilled the buyer's email here and the booking was dropped as a bot.
  it("is read-only and hidden from autofill, keyboard and screen readers", () => {
    const html = renderToStaticMarkup(<HoneypotField />);
    expect(html).toContain('name="website"');
    expect(html).toContain("readOnly");
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('data-1p-ignore="true"');
  });
});
