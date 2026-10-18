import {
  EMAIL_BRAND,
  emailButton,
  emailCode,
  emailLink,
  emailParagraph,
  escapeHtml,
  renderEmail,
} from "@lavieco/service-kit";
import type { OtpPurpose } from "@lavieco/shared/identity";

/** What each code is for, in the email (UI copy rule applies to frontends; emails live here). */
const PURPOSE_TEXT: Record<OtpPurpose, string> = {
  signup: "tạo tài khoản LAVIECO",
  reset_password: "đặt lại mật khẩu tài khoản LAVIECO",
  checkout: "xác nhận email nhận vé chương trình LAVIECO",
  ticket_lookup: "tra cứu vé chương trình LAVIECO",
};

const NOT_YOU =
  "Nếu bạn không thực hiện yêu cầu này, bạn có thể bỏ qua email. Đừng chia sẻ mã cho bất kỳ ai, kể cả người tự xưng là LAVIECO.";
const HELP = `Cần hỗ trợ? Liên hệ ${EMAIL_BRAND.email}.`;

/** One-time code (signup, password reset, checkout, ticket lookup). No device or IP: none is kept. */
export function otpCodeEmail(
  code: string,
  purpose: OtpPurpose,
  ttlMinutes: number,
  webUrl: string,
) {
  const action = PURPOSE_TEXT[purpose];
  const validity = `Mã có hiệu lực trong ${ttlMinutes} phút và chỉ dùng được một lần.`;
  return renderEmail({
    subject: `Mã xác thực LAVIECO: ${code}`,
    preheader: `Mã để ${action}, hiệu lực ${ttlMinutes} phút.`,
    eyebrow: "Mã xác thực",
    heading: "Xác minh email của bạn",
    bodyHtml: [
      emailParagraph(`Xin chào, đây là mã để <strong>${escapeHtml(action)}</strong>:`),
      emailCode(code),
      emailParagraph(escapeHtml(validity)),
      emailParagraph(escapeHtml(NOT_YOU), { muted: true, small: true }),
      emailParagraph(
        `Cần hỗ trợ? Liên hệ ${emailLink(EMAIL_BRAND.email, `mailto:${EMAIL_BRAND.email}`)}.`,
        { muted: true, small: true },
      ),
    ].join(""),
    textLines: [
      "Xin chào,",
      "",
      `Mã xác thực để ${action} của bạn là: ${code}`,
      validity,
      "",
      NOT_YOU,
      HELP,
    ],
    reason:
      "Bạn nhận email này vì có yêu cầu mã xác thực bằng địa chỉ email này trên website LAVIECO.",
    siteUrl: webUrl,
  });
}

/** Sent instead of a sign-up code when the address already has an account (no enumeration). */
export function accountExistsEmail(webUrl: string) {
  const login = new URL("/dang-nhap", webUrl).toString();
  const reset = new URL("/quen-mat-khau", webUrl).toString();
  const intro =
    "Có người vừa yêu cầu tạo tài khoản LAVIECO bằng địa chỉ email này, nhưng email đã có tài khoản.";
  const notYou = "Nếu không phải bạn, bạn có thể bỏ qua email này.";
  return renderEmail({
    subject: "Email này đã có tài khoản LAVIECO",
    preheader: "Bạn có thể đăng nhập hoặc đặt lại mật khẩu.",
    eyebrow: "Tài khoản",
    heading: "Email này đã có tài khoản",
    bodyHtml: [
      emailParagraph(escapeHtml(intro)),
      emailButton("Đăng nhập", login),
      emailParagraph(`Quên mật khẩu? ${emailLink("Đặt lại mật khẩu", reset)}.`),
      emailParagraph(escapeHtml(notYou), { muted: true, small: true }),
    ].join(""),
    textLines: [
      "Xin chào,",
      "",
      intro,
      `Bạn có thể đăng nhập tại ${login}`,
      `hoặc đặt lại mật khẩu tại ${reset}`,
      "",
      notYou,
    ],
    reason:
      "Bạn nhận email này vì có yêu cầu tạo tài khoản bằng địa chỉ email này trên website LAVIECO.",
    siteUrl: webUrl,
  });
}
