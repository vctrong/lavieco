import { describe, expect, it, vi } from "vitest";

import type { Logger } from "@lavieco/observability";

import type { MailProvider } from "../ports";
import { FailoverEmailSender, maskEmail } from "./failover-email-sender";
import type { MailRoute } from "./mail-routes";

const COOLDOWN_MS = 15 * 60_000;

function fakeRoute(provider: MailProvider) {
  const transport = {
    sendMail: vi.fn(() => Promise.resolve({ messageId: `<${provider}-id>` })),
    verify: vi.fn(() => Promise.resolve(true)),
    close: vi.fn(),
  };
  const route: MailRoute = {
    provider,
    transport,
    from: provider === "brevo" ? "LAVIECO <no-reply@lavieco.test>" : "lavieco@gmail.test",
    replyTo: "lien-he@lavieco.test",
    via: `${provider}.example.test:587`,
  };
  return { route, transport };
}

function fakeLogger() {
  const lines: { level: string; message: string; fields?: Record<string, unknown> }[] = [];
  const record = (level: string) => (message: string, fields?: Record<string, unknown>) => {
    lines.push({ level, message, fields });
  };
  const logger: Logger = {
    error: record("error"),
    warn: record("warn"),
    info: record("info"),
    debug: record("debug"),
    child: () => logger,
  };
  return { logger, lines };
}

const smtpError = (fields: Record<string, unknown>) =>
  Object.assign(new Error("554 khach@example.test rejected"), fields);

const message = {
  to: "khach@example.test",
  subject: "Mã xác thực",
  text: "Mã của bạn là 123456",
  html: "<p>Mã của bạn là <b>123456</b></p>",
};

function setup(options: { brevo?: boolean } = {}) {
  const brevo = fakeRoute("brevo");
  const gmail = fakeRoute("gmail");
  const { logger, lines } = fakeLogger();
  let now = 1_000_000;
  const sender = new FailoverEmailSender(
    { brevo: options.brevo === false ? null : brevo.route, gmail: gmail.route },
    { cooldownMs: COOLDOWN_MS, logger, now: () => now },
  );
  const advance = (ms: number) => {
    now += ms;
  };
  return { sender, brevo: brevo.transport, gmail: gmail.transport, lines, advance };
}

describe("FailoverEmailSender (ADR-0023)", () => {
  it("sends through Brevo and leaves Gmail alone when Brevo works", async () => {
    const { sender, brevo, gmail } = setup();
    await expect(sender.send(message)).resolves.toEqual({
      provider: "brevo",
      messageId: "<brevo-id>",
    });
    expect(brevo.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "LAVIECO <no-reply@lavieco.test>",
        replyTo: "lien-he@lavieco.test",
        to: message.to,
        text: message.text,
        html: message.html,
      }),
    );
    expect(gmail.sendMail).not.toHaveBeenCalled();
  });

  it("falls back to Gmail, with its own sender, when Brevo fails", async () => {
    const { sender, brevo, gmail, lines } = setup();
    brevo.sendMail.mockRejectedValueOnce(smtpError({ code: "EENVELOPE", responseCode: 554 }));
    await expect(sender.send(message)).resolves.toEqual({
      provider: "gmail",
      messageId: "<gmail-id>",
    });
    expect(gmail.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: "lavieco@gmail.test", text: message.text }),
    );
    expect(lines.find((line) => line.level === "warn")?.fields).toMatchObject({
      provider: "brevo",
      smtpCode: "EENVELOPE",
      responseCode: 554,
    });
  });

  it("skips Brevo during the cooldown, then tries it again", async () => {
    const { sender, brevo, gmail, advance } = setup();
    brevo.sendMail.mockRejectedValueOnce(smtpError({ code: "ETIMEDOUT" }));
    await sender.send(message);
    expect(brevo.sendMail).toHaveBeenCalledTimes(1);

    advance(COOLDOWN_MS - 1);
    await expect(sender.send(message)).resolves.toMatchObject({ provider: "gmail" });
    expect(brevo.sendMail).toHaveBeenCalledTimes(1);
    expect(gmail.sendMail).toHaveBeenCalledTimes(2);

    advance(1);
    await expect(sender.send(message)).resolves.toMatchObject({ provider: "brevo" });
    expect(brevo.sendMail).toHaveBeenCalledTimes(2);
    expect(gmail.sendMail).toHaveBeenCalledTimes(2);
  });

  it("throws one error carrying both causes when both routes fail", async () => {
    const { sender, brevo, gmail } = setup();
    const brevoFailure = smtpError({ code: "EAUTH", responseCode: 535 });
    const gmailFailure = smtpError({ code: "ETIMEDOUT" });
    brevo.sendMail.mockRejectedValueOnce(brevoFailure);
    gmail.sendMail.mockRejectedValueOnce(gmailFailure);
    const error = await sender.send(message).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors).toEqual([brevoFailure, gmailFailure]);
  });

  it("uses Gmail only without a Brevo key, and rethrows its error as is", async () => {
    const { sender, brevo, gmail } = setup({ brevo: false });
    await expect(sender.send(message)).resolves.toMatchObject({ provider: "gmail" });
    expect(brevo.sendMail).not.toHaveBeenCalled();

    const failure = smtpError({ code: "ECONNECTION" });
    gmail.sendMail.mockRejectedValueOnce(failure);
    await expect(sender.send(message)).rejects.toBe(failure);
  });

  it("logs provider, id, duration and a masked recipient, never the content", async () => {
    const { sender, brevo, lines } = setup();
    brevo.sendMail.mockRejectedValueOnce(smtpError({ code: "EENVELOPE", responseCode: 554 }));
    await sender.send(message);
    const info = lines.find((line) => line.message === "mail sent");
    expect(info?.fields).toEqual({
      provider: "gmail",
      messageId: "<gmail-id>",
      durationMs: 0,
      recipient: "k***@example.test",
    });
    const logged = JSON.stringify(lines);
    expect(logged).not.toContain("khach@example.test");
    expect(logged).not.toContain("123456");
    expect(logged).not.toContain(message.subject);
  });

  it("closes both pools on shutdown", () => {
    const { sender, brevo, gmail } = setup();
    sender.onApplicationShutdown();
    expect(brevo.close).toHaveBeenCalled();
    expect(gmail.close).toHaveBeenCalled();
  });
});

describe("maskEmail", () => {
  it("keeps the first letter and the domain", () => {
    expect(maskEmail("trong@gmail.com")).toBe("t***@gmail.com");
    expect(maskEmail("not-an-address")).toBe("***");
  });
});
