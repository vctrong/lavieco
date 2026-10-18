import { describe, expect, it } from "vitest";

import { emailHtmlIssues } from "@lavieco/service-kit";

import { passwordChangedEmail } from "./password-changed.template";

describe("passwordChangedEmail", () => {
  it("uses the shared layout with the reset link", () => {
    const mail = passwordChangedEmail("http://localhost:3000");
    expect(emailHtmlIssues(mail.html)).toEqual([]);
    expect(mail.html).toContain("http://localhost:3000/quen-mat-khau");
    expect(mail.text).toContain("http://localhost:3000/quen-mat-khau");
    expect(mail.html).toMatchSnapshot("html");
  });
});
