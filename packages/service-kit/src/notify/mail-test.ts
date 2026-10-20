import type { MailProvider } from "../ports";
import { emailParagraph, escapeHtml, renderEmail } from "./email";
import type { MailEnv } from "./mail-env";
import { brevoRoute, deliver, gmailRoute, type MailRoute } from "./mail-routes";
import { describeSmtpError } from "./smtp-diagnostics";

/** `--provider`: one route alone, or `auto` = the order the services use (ADR-0023). */
export type MailTestProvider = "auto" | MailProvider;

export const MAIL_TEST_PROVIDERS = ["auto", "brevo", "gmail"] as const;

export type MailTestAttempt =
  | { provider: MailProvider; via: string; ok: true; messageId: string }
  | { provider: MailProvider; via: string; ok: false; step: string; reason: string };

export type MailTestResult =
  | { ok: true; provider: MailProvider; attempts: MailTestAttempt[] }
  | { ok: false; attempts: MailTestAttempt[]; reason?: string };

/**
 * `npm run mail:test -- <email> [--provider=auto|brevo|gmail]`: logs in to each route
 * in turn, then sends one plain test message with the service's own settings. `auto`
 * stops at the first route that delivers. The result names servers, never logins.
 */
export async function runMailTest(
  service: string,
  env: MailEnv,
  to: string,
  options: {
    provider?: MailTestProvider;
    routes?: { brevo: MailRoute | null; gmail: MailRoute };
  } = {},
): Promise<MailTestResult> {
  const provider = options.provider ?? "auto";
  const routes = options.routes ?? { brevo: brevoRoute(env), gmail: gmailRoute(env) };
  try {
    if (provider === "brevo" && !routes.brevo) {
      return {
        ok: false,
        attempts: [],
        reason: "Chưa cấu hình Brevo: điền BREVO_SMTP_USER và BREVO_SMTP_KEY.",
      };
    }
    const order = (provider === "auto" ? [routes.brevo, routes.gmail] : [routes[provider]]).filter(
      (route): route is MailRoute => route !== null,
    );
    const attempts: MailTestAttempt[] = [];
    for (const route of order) {
      const attempt = await check(service, route, to);
      attempts.push(attempt);
      if (attempt.ok) return { ok: true, provider: route.provider, attempts };
    }
    return { ok: false, attempts };
  } finally {
    // Pooled connections would keep the CLI process alive.
    routes.brevo?.transport.close();
    routes.gmail.transport.close();
  }
}

async function check(service: string, route: MailRoute, to: string): Promise<MailTestAttempt> {
  const { provider, via } = route;
  try {
    await route.transport.verify();
  } catch (error) {
    const reason = describeSmtpError(error, provider);
    return { provider, via, ok: false, step: `kết nối ${via}`, reason };
  }
  try {
    const delivery = await deliver(route, { to, ...mailTestEmail(service, new Date()) });
    return { provider, via, ok: true, messageId: delivery.messageId };
  } catch (error) {
    return {
      provider,
      via,
      ok: false,
      step: "gửi email",
      reason: describeSmtpError(error, provider),
    };
  }
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
