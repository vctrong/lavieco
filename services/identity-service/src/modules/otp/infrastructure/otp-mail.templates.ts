import type { OtpPurpose } from "@lavieco/shared/identity";

/** What each code is for, in the email (UI copy rule applies to frontends; emails live here). */
const PURPOSE_TEXT: Record<OtpPurpose, string> = {
  signup: "tạo tài khoản LAVIECO",
  reset_password: "đặt lại mật khẩu tài khoản LAVIECO",
  checkout: "xác nhận email nhận vé chương trình LAVIECO",
  ticket_lookup: "tra cứu vé chương trình LAVIECO",
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

export function otpCodeEmail(code: string, purpose: OtpPurpose, ttlMinutes: number) {
  const action = PURPOSE_TEXT[purpose];
  const subject = `Mã xác thực LAVIECO: ${code}`;
  const text = [
    "Xin chào,",
    "",
    `Mã xác thực để ${action} của bạn là: ${code}`,
    `Mã có hiệu lực trong ${ttlMinutes} phút và chỉ dùng được một lần.`,
    "",
    "Nếu bạn không thực hiện yêu cầu này, bạn có thể bỏ qua email. Đừng chia sẻ mã cho bất kỳ ai, kể cả người tự xưng là LAVIECO.",
    "",
    "LAVIECO · Giáo dục sáng tạo xanh, thông qua nghệ thuật",
  ].join("\n");
  const html = `<p>Xin chào,</p>
<p>Mã xác thực để ${escapeHtml(action)} của bạn là:</p>
<p style="font-size:28px;letter-spacing:6px;font-weight:bold">${escapeHtml(code)}</p>
<p>Mã có hiệu lực trong ${ttlMinutes} phút và chỉ dùng được một lần.</p>
<p>Nếu bạn không thực hiện yêu cầu này, bạn có thể bỏ qua email. Đừng chia sẻ mã cho bất kỳ ai, kể cả người tự xưng là LAVIECO.</p>
<p>LAVIECO · Giáo dục sáng tạo xanh, thông qua nghệ thuật</p>`;
  return { subject, text, html };
}

/** Sent instead of a sign-up code when the address already has an account (no enumeration). */
export function accountExistsEmail(webUrl: string) {
  const login = new URL("/dang-nhap", webUrl).toString();
  const reset = new URL("/quen-mat-khau", webUrl).toString();
  const subject = "Email này đã có tài khoản LAVIECO";
  const text = [
    "Xin chào,",
    "",
    "Có người vừa yêu cầu tạo tài khoản LAVIECO bằng địa chỉ email này, nhưng email đã có tài khoản.",
    `Bạn có thể đăng nhập tại ${login}`,
    `hoặc đặt lại mật khẩu tại ${reset}`,
    "",
    "Nếu không phải bạn, bạn có thể bỏ qua email này.",
    "",
    "LAVIECO · Giáo dục sáng tạo xanh, thông qua nghệ thuật",
  ].join("\n");
  const html = `<p>Xin chào,</p>
<p>Có người vừa yêu cầu tạo tài khoản LAVIECO bằng địa chỉ email này, nhưng email đã có tài khoản.</p>
<p><a href="${escapeHtml(login)}">Đăng nhập</a> hoặc <a href="${escapeHtml(reset)}">đặt lại mật khẩu</a>.</p>
<p>Nếu không phải bạn, bạn có thể bỏ qua email này.</p>
<p>LAVIECO · Giáo dục sáng tạo xanh, thông qua nghệ thuật</p>`;
  return { subject, text, html };
}
