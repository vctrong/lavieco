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
  sender: Pick<SmtpEmailSender, "verify" | "send"> = new SmtpEmailSender(env),
): Promise<MailTestResult> {
  const via = `${env.SMTP_HOST}:${env.SMTP_PORT}${env.SMTP_SECURE ? " (TLS)" : ""}`;
  try {
    await sender.verify();
  } catch (error) {
    return { ok: false, step: `kết nối ${via}`, reason: describeSmtpError(error) };
  }
  try {
    await sender.send({
      to,
      subject: `LAVIECO: kiểm tra gửi email (${service})`,
      text:
        `Email này được gửi bằng lệnh npm run mail:test từ ${service} lúc ` +
        `${new Date().toISOString()}. Nhận được nghĩa là cấu hình SMTP của ${service} đã đúng. ` +
        "Không cần trả lời.",
    });
  } catch (error) {
    return { ok: false, step: "gửi email", reason: describeSmtpError(error) };
  }
  return { ok: true, via };
}
