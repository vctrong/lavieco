type SmtpFailure = {
  code?: unknown;
  responseCode?: unknown;
  message?: unknown;
  cause?: unknown;
};

/**
 * A Nodemailer failure in words an operator can act on (`npm run mail:test`). It names
 * the variable to check and never repeats the server's reply, which may echo addresses.
 */
export function describeSmtpError(error: unknown): string {
  const failure = (typeof error === "object" && error !== null ? error : {}) as SmtpFailure;
  const code = typeof failure.code === "string" ? failure.code : "";
  const responseCode = typeof failure.responseCode === "number" ? failure.responseCode : 0;
  const message = typeof failure.message === "string" ? failure.message : "";

  if (code === "EAUTH" || responseCode === 535 || responseCode === 534) {
    return (
      "Sai SMTP_USER hoặc SMTP_PASS (máy chủ từ chối đăng nhập). Với Gmail: SMTP_USER là " +
      "địa chỉ Gmail, SMTP_PASS là App Password 16 ký tự (cần bật xác minh 2 bước), không " +
      "phải mật khẩu Gmail."
    );
  }
  if (code === "EDNS" || /ENOTFOUND|EAI_AGAIN/.test(message)) {
    return "Không tìm thấy máy chủ SMTP_HOST: sai tên máy chủ hoặc máy đang mất mạng.";
  }
  if (/ECONNREFUSED/.test(message)) {
    return (
      "Máy chủ từ chối kết nối ở SMTP_PORT: sai cổng, hoặc dịch vụ chưa chạy (Mailpit: " +
      "npm run dev:infra)."
    );
  }
  if (code === "ETLS" || /wrong version number|ssl3_get_record|tls/i.test(message)) {
    return (
      "Lệch kiểu TLS giữa SMTP_PORT và SMTP_SECURE: cổng 465 cần SMTP_SECURE=true, cổng " +
      "587 cần SMTP_SECURE=false (tự nâng lên STARTTLS)."
    );
  }
  if (code === "ETIMEDOUT" || code === "ECONNECTION" || /timeout|ETIMEDOUT/i.test(message)) {
    return (
      "Hết thời gian chờ kết nối tới SMTP_HOST:SMTP_PORT. Cổng có thể bị nhà mạng hoặc " +
      "tường lửa chặn (cổng 25 thường bị chặn): thử 587, hoặc 465 với SMTP_SECURE=true."
    );
  }
  if (code === "EENVELOPE" || [550, 551, 553, 554].includes(responseCode)) {
    return (
      "Máy chủ từ chối địa chỉ gửi hoặc nhận. Kiểm tra MAIL_FROM: với Gmail phải là chính " +
      "địa chỉ Gmail đăng nhập; với nhà cung cấp email giao dịch phải thuộc tên miền đã " +
      "xác minh (SPF/DKIM)."
    );
  }
  return `Gửi thất bại (mã ${code || "?"}${responseCode ? `, SMTP ${responseCode}` : ""}).`;
}
