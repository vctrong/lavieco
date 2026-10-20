import type { MailProvider } from "../ports";

type SmtpFailure = {
  code?: unknown;
  responseCode?: unknown;
  message?: unknown;
  cause?: unknown;
};

/** The variables an operator edits for each route (docs/06, ADR-0023). */
const VARIABLES = {
  gmail: {
    host: "SMTP_HOST",
    port: "SMTP_PORT",
    user: "SMTP_USER",
    pass: "SMTP_PASS",
    from: "MAIL_FROM_FALLBACK (hoặc MAIL_FROM khi để trống)",
  },
  brevo: {
    host: "BREVO_SMTP_HOST",
    port: "BREVO_SMTP_PORT",
    user: "BREVO_SMTP_USER",
    pass: "BREVO_SMTP_KEY",
    from: "MAIL_FROM",
  },
} as const;

/**
 * A Nodemailer failure in words an operator can act on (`npm run mail:test`). It names
 * the variable to check and never repeats the server's reply, which may echo addresses.
 */
export function describeSmtpError(error: unknown, provider: MailProvider = "gmail"): string {
  const failure = (typeof error === "object" && error !== null ? error : {}) as SmtpFailure;
  const code = typeof failure.code === "string" ? failure.code : "";
  const responseCode = typeof failure.responseCode === "number" ? failure.responseCode : 0;
  const message = typeof failure.message === "string" ? failure.message : "";
  const names = VARIABLES[provider];

  if (code === "EAUTH" || responseCode === 535 || responseCode === 534) {
    return provider === "brevo"
      ? `Sai ${names.user} hoặc ${names.pass} (Brevo từ chối đăng nhập). Lấy cả hai ở ` +
          "Brevo > SMTP & API > SMTP: login dạng ...@smtp-brevo.com và SMTP key, không " +
          "phải API key v3."
      : `Sai ${names.user} hoặc ${names.pass} (máy chủ từ chối đăng nhập). Với Gmail: ` +
          `${names.user} là địa chỉ Gmail, ${names.pass} là App Password 16 ký tự (cần bật ` +
          "xác minh 2 bước), không phải mật khẩu Gmail.";
  }
  if (code === "EDNS" || /ENOTFOUND|EAI_AGAIN/.test(message)) {
    return `Không tìm thấy máy chủ ${names.host}: sai tên máy chủ hoặc máy đang mất mạng.`;
  }
  if (/ECONNREFUSED/.test(message)) {
    return (
      `Máy chủ từ chối kết nối ở ${names.port}: sai cổng, hoặc dịch vụ chưa chạy (Mailpit: ` +
      "npm run dev:infra)."
    );
  }
  if (code === "ETLS" || /wrong version number|ssl3_get_record|tls/i.test(message)) {
    return provider === "brevo"
      ? `Lỗi TLS với ${names.host}:${names.port}: Brevo dùng 587 (STARTTLS) hoặc 465 (TLS).`
      : `Lệch kiểu TLS giữa ${names.port} và SMTP_SECURE: cổng 465 cần SMTP_SECURE=true, ` +
          "cổng 587 cần SMTP_SECURE=false (tự nâng lên STARTTLS).";
  }
  if (code === "ETIMEDOUT" || code === "ECONNECTION" || /timeout|ETIMEDOUT/i.test(message)) {
    return (
      `Hết thời gian chờ kết nối tới ${names.host}:${names.port}. Cổng có thể bị nhà mạng ` +
      "hoặc tường lửa chặn (cổng 25 thường bị chặn): thử 587, hoặc 465 với TLS."
    );
  }
  if (code === "EENVELOPE" || [550, 551, 553, 554].includes(responseCode)) {
    return provider === "brevo"
      ? `Brevo từ chối địa chỉ gửi hoặc nhận, hoặc đã hết hạn mức gửi trong ngày. Kiểm tra ` +
          `${names.from} thuộc tên miền đã xác minh trên Brevo, và hạn mức ở trang Brevo.`
      : `Máy chủ từ chối địa chỉ gửi hoặc nhận. Kiểm tra ${names.from}: với Gmail phải là ` +
          "chính địa chỉ Gmail đăng nhập; với nhà cung cấp email giao dịch phải thuộc tên " +
          "miền đã xác minh (SPF/DKIM).";
  }
  return `Gửi thất bại (mã ${code || "?"}${responseCode ? `, SMTP ${responseCode}` : ""}).`;
}
