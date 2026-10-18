import { describe, expect, it } from "vitest";

import { emailHtmlIssues } from "@lavieco/service-kit";
import { OTP_PURPOSES } from "@lavieco/shared/identity";

import { accountExistsEmail, otpCodeEmail } from "./otp-mail.templates";

const WEB = "http://localhost:3000";

describe("otpCodeEmail", () => {
  it.each(OTP_PURPOSES)("%s: the code as text, its validity, in the shared layout", (purpose) => {
    const mail = otpCodeEmail("482913", purpose, 10, WEB);
    expect(mail.subject).toBe("Mã xác thực LAVIECO: 482913");
    expect(mail.html).toContain(">482913</td>");
    expect(mail.html).toContain("10 phút");
    expect(mail.text).toContain("482913");
    expect(mail.text).toContain("10 phút");
    expect(emailHtmlIssues(mail.html)).toEqual([]);
    // No device or IP line: none is collected.
    expect(mail.html).not.toMatch(/IP|thiết bị/i);
  });

  it("matches the snapshot", () => {
    const mail = otpCodeEmail("482913", "checkout", 10, WEB);
    expect(mail.html).toMatchSnapshot("html");
    expect(mail.text).toMatchSnapshot("text");
  });
});

describe("accountExistsEmail", () => {
  it("uses the shared layout with its links", () => {
    const mail = accountExistsEmail(WEB);
    const paths = ["/dang-nhap", "/quen-mat-khau"];
    expect(emailHtmlIssues(mail.html)).toEqual([]);
    for (const path of paths) {
      expect(mail.html).toContain(`${WEB}${path}`);
      expect(mail.text).toContain(`${WEB}${path}`);
    }
    expect(mail.html).toMatchSnapshot("html");
  });
});
