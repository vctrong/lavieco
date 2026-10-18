import { describe, expect, it } from "vitest";

import { isLoopbackHost, mailConfigIssue } from "./mail-env";

const mailpit = { SMTP_HOST: "127.0.0.1", SMTP_PORT: "1025", SMTP_SECURE: "false" };

describe("mailConfigIssue", () => {
  it("accepts Mailpit without a login and a provider on 587 or 465", () => {
    expect(mailConfigIssue(mailpit)).toBeNull();
    expect(
      mailConfigIssue({
        SMTP_HOST: "smtp.example.test",
        SMTP_PORT: "587",
        SMTP_USER: "u",
        SMTP_PASS: "p",
      }),
    ).toBeNull();
    expect(
      mailConfigIssue({
        SMTP_HOST: "smtp.example.test",
        SMTP_PORT: 465,
        SMTP_SECURE: true,
        SMTP_USER: "u",
        SMTP_PASS: "p",
      }),
    ).toBeNull();
  });

  it("names the half-filled login variable", () => {
    expect(mailConfigIssue({ ...mailpit, SMTP_USER: "u", SMTP_PASS: "" })).toBe("SMTP_PASS");
    expect(mailConfigIssue({ ...mailpit, SMTP_PASS: "p" })).toBe("SMTP_USER");
  });

  it("refuses a TLS mode the port cannot speak", () => {
    expect(mailConfigIssue({ SMTP_HOST: "h", SMTP_PORT: "465", SMTP_SECURE: "false" })).toBe(
      "SMTP_SECURE",
    );
    expect(mailConfigIssue({ SMTP_HOST: "h", SMTP_PORT: "587", SMTP_SECURE: "true" })).toBe(
      "SMTP_SECURE",
    );
  });

  it("ignores services without mail settings", () => {
    expect(mailConfigIssue({})).toBeNull();
  });
});

describe("isLoopbackHost", () => {
  it("tells Mailpit on this machine from a remote provider", () => {
    expect(isLoopbackHost("127.0.0.1")).toBe(true);
    expect(isLoopbackHost("localhost")).toBe(true);
    expect(isLoopbackHost("smtp.gmail.com")).toBe(false);
  });
});
