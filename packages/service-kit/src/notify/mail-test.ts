import { emailParagraph, escapeHtml, renderEmail } from "./email";
import type { MailEnv } from "./mail-env";
import { SmtpEmailSender } from "./notify.module";
import { describeSmtpError } from "./smtp-diagnostics";

export type MailTestResult =
  { ok: true; via: string } | { ok: false; step: string; reason: string };

/**
 * `npm run mail:test -- <email>`: logs in to the SMTP server, then sends one plain test
 * message with the service's own settings. The result names the server, never the login.
 */
export async function runMailTest(
  service: string,
  env: MailEnv,
  to: string,
  sender: Pick<SmtpEmailSender, "verify" | "send" | "close"> = new SmtpEmailSender(env),
): Promise<MailTestResult> {
  try {
    return await check(service, env, to, sender);
  } finally {
    // Pooled connections would keep the CLI process alive.
    sender.close();
  }
}

async function check(
  service: string,
  env: MailEnv,
  to: string,
  sender: Pick<SmtpEmailSender, "verify" | "send">,
): Promise<MailTestResult> {
  const via = `${env.SMTP_HOST}:${env.SMTP_PORT}${env.SMTP_SECURE ? " (TLS)" : ""}`;
  try {
    await sender.verify();
  } catch (error) {
    return { ok: false, step: `kết nối ${via}`, reason: describeSmtpError(error) };
  }
  try {
    await sender.send({ to, ...mailTestEmail(service, new Date()) });
  } catch (error) {
    return { ok: false, step: "gửi email", reason: describeSmtpError(error) };
  }
  return { ok: true, via };
}

/** The test message, in the shared layout so `mail:test` also shows how emails render. */
export function mailTestEmail(service: string, at: Date) {
  const lines = [
    `Email này được gửi bằng lệnh npm run mail:test từ ${service} lúc ${at.toISOString()}.`,
    `Nhận được nghĩa là cấu hình SMTP của ${service} đã đúng. Không cần trả lời.`,
  ];
  return renderEmail({
    subject: `LAVIECO: kiểm tra gửi email (${service})`,
    preheader: `Cấu hình SMTP của ${service} đã gửi được thư.`,
    eyebrow: "Kiểm tra cấu hình",
    heading: "Gửi email thành công",
    bodyHtml: lines.map((line) => emailParagraph(escapeHtml(line))).join(""),
    textLines: lines,
    reason: "Đây là email kiểm tra cấu hình gửi thư, chỉ gửi khi đội vận hành chạy lệnh kiểm tra.",
  });
}
