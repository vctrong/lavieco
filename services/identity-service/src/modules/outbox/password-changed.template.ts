/** "Was this you?" notice after a password reset. */
export function passwordChangedEmail(webUrl: string) {
  const reset = new URL("/quen-mat-khau", webUrl).toString();
  const subject = "Mật khẩu tài khoản LAVIECO vừa được đổi";
  const text = [
    "Xin chào,",
    "",
    "Mật khẩu tài khoản LAVIECO của bạn vừa được đặt lại, và mọi phiên đăng nhập cũ đã được đăng xuất.",
    `Nếu không phải bạn, hãy đặt lại mật khẩu ngay tại ${reset} và liên hệ LAVIECO.`,
    "",
    "LAVIECO · Giáo dục sáng tạo xanh, thông qua nghệ thuật",
  ].join("\n");
  const html = `<p>Xin chào,</p>
<p>Mật khẩu tài khoản LAVIECO của bạn vừa được đặt lại, và mọi phiên đăng nhập cũ đã được đăng xuất.</p>
<p>Nếu không phải bạn, hãy <a href="${reset}">đặt lại mật khẩu ngay</a> và liên hệ LAVIECO.</p>
<p>LAVIECO · Giáo dục sáng tạo xanh, thông qua nghệ thuật</p>`;
  return { subject, text, html };
}
