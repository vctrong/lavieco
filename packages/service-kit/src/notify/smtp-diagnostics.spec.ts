import { describe, expect, it } from "vitest";

import { runMailTest } from "./mail-test";
import { describeSmtpError } from "./smtp-diagnostics";

const smtpError = (fields: Record<string, unknown>) =>
  Object.assign(new Error(String(fields.message ?? "")), fields);

describe("describeSmtpError", () => {
  it.each([
    [{ code: "EAUTH", responseCode: 535, message: "Invalid login" }, /SMTP_PASS/],
    [{ code: "EDNS", message: "getaddrinfo ENOTFOUND smtp.sai.test" }, /SMTP_HOST/],
    [{ code: "ESOCKET", message: "connect ECONNREFUSED 127.0.0.1:1025" }, /SMTP_PORT/],
    [{ code: "ESOCKET", message: "ssl3_get_record:wrong version number" }, /SMTP_SECURE/],
    [{ code: "ETIMEDOUT", message: "Connection timeout" }, /chặn/],
    [{ code: "EENVELOPE", responseCode: 553, message: "Sender rejected" }, /MAIL_FROM/],
  ])("explains %o", (fields, hint) => {
    expect(describeSmtpError(smtpError(fields))).toMatch(hint);
  });

  it("never repeats the server reply, which may echo an address", () => {
    const text = describeSmtpError(
      smtpError({ code: "EMESSAGE", responseCode: 452, message: "452 khach@example.test full" }),
    );
    expect(text).not.toContain("khach@example.test");
    expect(text).toContain("452");
  });
});

describe("runMailTest", () => {
  const env = {
    MAIL_PROVIDER: "smtp" as const,
    SMTP_HOST: "smtp.example.test",
    SMTP_PORT: 587,
    SMTP_SECURE: false,
    SMTP_USER: "user@example.test",
    SMTP_PASS: "secret-pass",
    MAIL_FROM: "LAVIECO <no-reply@example.test>",
  };

  it("stops at login and explains it, without the login in the result", async () => {
    const result = await runMailTest("program-service", env, "to@example.test", {
      verify: () => Promise.reject(smtpError({ code: "EAUTH", responseCode: 535 })),
      send: () => Promise.resolve(),
    });
    expect(result).toMatchObject({ ok: false, step: "kết nối smtp.example.test:587" });
    expect(JSON.stringify(result)).not.toMatch(/secret-pass|user@example\.test/);
  });

  it("sends one message once the login works", async () => {
    const sent: string[] = [];
    const result = await runMailTest("identity-service", env, "to@example.test", {
      verify: () => Promise.resolve(),
      send: (message) => {
        sent.push(message.subject);
        return Promise.resolve();
      },
    });
    expect(result).toEqual({ ok: true, via: "smtp.example.test:587" });
    expect(sent).toEqual(["LAVIECO: kiểm tra gửi email (identity-service)"]);
  });
});
