import { describe, expect, it } from "vitest";

import { isLoopbackHost, mailConfigIssue, mailEnvSchema, senderDomain } from "./mail-env";

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

  describe("with Brevo in front (ADR-0023)", () => {
    const brevo = {
      ...mailpit,
      MAIL_FROM: "LAVIECO <no-reply@lavieco.io.vn>",
      MAIL_FROM_FALLBACK: "LAVIECO <lavieco.section@gmail.com>",
      BREVO_SMTP_USER: "login@smtp-brevo.com",
      BREVO_SMTP_KEY: "key",
    };

    it("accepts a Gmail fallback sender", () => {
      expect(mailConfigIssue(brevo)).toBeNull();
    });

    it("names the half-filled Brevo login", () => {
      expect(mailConfigIssue({ ...brevo, BREVO_SMTP_USER: "" })).toBe("BREVO_SMTP_USER");
      expect(mailConfigIssue({ ...brevo, BREVO_SMTP_KEY: "" })).toBe("BREVO_SMTP_KEY");
    });

    it("requires a fallback sender outside the verified domain", () => {
      expect(mailConfigIssue({ ...brevo, MAIL_FROM_FALLBACK: "" })).toBe("MAIL_FROM_FALLBACK");
      expect(mailConfigIssue({ ...brevo, MAIL_FROM_FALLBACK: undefined })).toBe(
        "MAIL_FROM_FALLBACK",
      );
      expect(mailConfigIssue({ ...brevo, MAIL_FROM_FALLBACK: "LAVIECO <ve@LAVIECO.io.vn>" })).toBe(
        "MAIL_FROM_FALLBACK",
      );
    });

    it("lets MAIL_FROM_FALLBACK default to MAIL_FROM without Brevo (development)", () => {
      expect(
        mailConfigIssue({
          ...brevo,
          BREVO_SMTP_USER: "",
          BREVO_SMTP_KEY: "",
          MAIL_FROM_FALLBACK: "",
        }),
      ).toBeNull();
    });
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

describe("senderDomain", () => {
  it("reads the domain of a bare or named address", () => {
    expect(senderDomain("LAVIECO <no-reply@Lavieco.io.vn>")).toBe("lavieco.io.vn");
    expect(senderDomain("lavieco.section@gmail.com")).toBe("gmail.com");
    expect(senderDomain("no address")).toBe("");
  });
});

describe("mailEnvSchema", () => {
  const minimal = { SMTP_HOST: "127.0.0.1", SMTP_PORT: "1025", MAIL_FROM: "a@b.test" };

  it("defaults Brevo host, port and cooldown, and treats empty values as unset", () => {
    const env = mailEnvSchema.parse({
      ...minimal,
      BREVO_SMTP_HOST: "",
      BREVO_SMTP_PORT: "",
      BREVO_SMTP_KEY: "",
      BREVO_COOLDOWN_MINUTES: "",
      MAIL_FROM_FALLBACK: "",
      MAIL_REPLY_TO: "",
    });
    expect(env).toMatchObject({
      BREVO_SMTP_HOST: "smtp-relay.brevo.com",
      BREVO_SMTP_PORT: 587,
      BREVO_COOLDOWN_MINUTES: 15,
    });
    expect(env.BREVO_SMTP_KEY).toBeUndefined();
    expect(env.MAIL_FROM_FALLBACK).toBeUndefined();
    expect(env.MAIL_REPLY_TO).toBeUndefined();
  });
});
