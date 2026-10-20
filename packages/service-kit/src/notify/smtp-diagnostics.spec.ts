import { describe, expect, it, vi } from "vitest";

import type { MailProvider } from "../ports";
import { mailEnvSchema } from "./mail-env";
import type { MailRoute } from "./mail-routes";
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

  it("names the BREVO_* variables on the Brevo route", () => {
    expect(describeSmtpError(smtpError({ code: "EAUTH", responseCode: 535 }), "brevo")).toMatch(
      /BREVO_SMTP_KEY/,
    );
    expect(describeSmtpError(smtpError({ code: "EDNS" }), "brevo")).toMatch(/BREVO_SMTP_HOST/);
  });
});

describe("runMailTest", () => {
  const env = mailEnvSchema.parse({
    SMTP_HOST: "smtp.example.test",
    SMTP_PORT: "587",
    SMTP_USER: "user@example.test",
    SMTP_PASS: "secret-pass",
    MAIL_FROM: "LAVIECO <no-reply@example.test>",
  });

  function fakeRoute(provider: MailProvider, fail: { verify?: Error; send?: Error } = {}) {
    const sent: string[] = [];
    const transport = {
      verify: vi.fn(() => (fail.verify ? Promise.reject(fail.verify) : Promise.resolve(true))),
      sendMail: vi.fn((options: { subject?: string }) => {
        if (fail.send) return Promise.reject(fail.send);
        sent.push(String(options.subject));
        return Promise.resolve({ messageId: `<${provider}-id>` });
      }),
      close: vi.fn(),
    };
    const route: MailRoute = {
      provider,
      transport,
      from: "x@example.test",
      via: `${provider}:587`,
    };
    return { route, transport, sent };
  }

  it("stops at login and explains it, without the login in the result", async () => {
    const gmail = fakeRoute("gmail", { verify: smtpError({ code: "EAUTH", responseCode: 535 }) });
    const result = await runMailTest("program-service", env, "to@example.test", {
      provider: "gmail",
      routes: { brevo: null, gmail: gmail.route },
    });
    expect(result).toMatchObject({
      ok: false,
      attempts: [{ provider: "gmail", ok: false, step: "kết nối gmail:587" }],
    });
    expect(JSON.stringify(result)).not.toMatch(/secret-pass|user@example\.test/);
    expect(gmail.transport.close).toHaveBeenCalled();
  });

  it("sends one message once the login works", async () => {
    const gmail = fakeRoute("gmail");
    const result = await runMailTest("identity-service", env, "to@example.test", {
      routes: { brevo: null, gmail: gmail.route },
    });
    expect(result).toEqual({
      ok: true,
      provider: "gmail",
      attempts: [{ provider: "gmail", via: "gmail:587", ok: true, messageId: "<gmail-id>" }],
    });
    expect(gmail.sent).toEqual(["LAVIECO: kiểm tra gửi email (identity-service)"]);
  });

  it("auto tries Brevo first and reports why it moved on to Gmail", async () => {
    const brevo = fakeRoute("brevo", { send: smtpError({ code: "EENVELOPE", responseCode: 554 }) });
    const gmail = fakeRoute("gmail");
    const result = await runMailTest("identity-service", env, "to@example.test", {
      routes: { brevo: brevo.route, gmail: gmail.route },
    });
    expect(result).toMatchObject({
      ok: true,
      provider: "gmail",
      attempts: [
        { provider: "brevo", ok: false, step: "gửi email" },
        { provider: "gmail", ok: true },
      ],
    });
    expect(brevo.transport.close).toHaveBeenCalled();
  });

  it("tests one route alone with --provider", async () => {
    const brevo = fakeRoute("brevo");
    const gmail = fakeRoute("gmail");
    const result = await runMailTest("identity-service", env, "to@example.test", {
      provider: "brevo",
      routes: { brevo: brevo.route, gmail: gmail.route },
    });
    expect(result).toMatchObject({ ok: true, provider: "brevo" });
    expect(gmail.transport.verify).not.toHaveBeenCalled();
    expect(gmail.transport.sendMail).not.toHaveBeenCalled();
  });

  it("says Brevo is not configured instead of testing Gmail", async () => {
    const gmail = fakeRoute("gmail");
    const result = await runMailTest("identity-service", env, "to@example.test", {
      provider: "brevo",
      routes: { brevo: null, gmail: gmail.route },
    });
    expect(result).toMatchObject({ ok: false, attempts: [] });
    expect(result.ok ? "" : result.reason).toMatch(/BREVO_SMTP_KEY/);
    expect(gmail.transport.sendMail).not.toHaveBeenCalled();
  });
});
