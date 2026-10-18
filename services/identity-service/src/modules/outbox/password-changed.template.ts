import { emailButton, emailParagraph, escapeHtml, renderEmail } from "@lavieco/service-kit";

/** "Was this you?" notice after a password reset. */
export function passwordChangedEmail(webUrl: string) {
  const reset = new URL("/quen-mat-khau", webUrl).toString();
  const intro =
    "Mật khẩu tài khoản LAVIECO của bạn vừa được đặt lại, và mọi phiên đăng nhập cũ đã được đăng xuất.";
  const notYou = "Nếu không phải bạn, hãy đặt lại mật khẩu ngay và liên hệ LAVIECO.";
  return renderEmail({
    subject: "Mật khẩu tài khoản LAVIECO vừa được đổi",
    preheader: "Mọi phiên đăng nhập cũ đã được đăng xuất.",
    eyebrow: "Bảo mật tài khoản",
    heading: "Mật khẩu vừa được đổi",
    bodyHtml: [
      emailParagraph(escapeHtml(intro)),
      emailParagraph(escapeHtml(notYou)),
      emailButton("Đặt lại mật khẩu", reset),
    ].join(""),
    textLines: ["Xin chào,", "", intro, `${notYou} Đặt lại tại ${reset}`],
    reason: "Bạn nhận email này vì mật khẩu tài khoản gắn với địa chỉ email này vừa thay đổi.",
    siteUrl: webUrl,
  });
}
