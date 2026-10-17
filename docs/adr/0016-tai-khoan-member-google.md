# ADR-016: Tài khoản Member và đăng nhập Google ở Giai đoạn 1

| | |
|---|---|
| **Trạng thái** | Chấp nhận |
| **Ngày** | 17/10/2026 |
| **Người đề xuất** | V.C. Trọng |
| **Liên quan** | `docs/05` §2, §5.5, `docs/01` UC-09, `docs/02` §9.2, ADR-018 |

## Bối cảnh

`docs/01` xếp tài khoản Member vào GĐ2. Phân hệ Chương trình (ADR-014) cần tài khoản để xem lại vé, bỏ qua OTP khi email đã xác thực, và gắn đơn cũ theo email.

## Quyết định

1. **Member nằm trong `identity-service`** (`users.type = member`), không tạo service auth thứ hai.
2. Đăng ký bằng **email + mật khẩu sau khi xác thực email bằng OTP** (6 số, 5 phút, tối đa 5 lần nhập, 3 lần gửi/10 phút mỗi email, giới hạn theo IP). Cơ chế OTP **dùng chung** cho `signup`, `reset_password`, `checkout`, `ticket_lookup`.
3. **Google chỉ dành cho Member**, không dành cho admin. Luồng Authorization Code + PKCE + state:
   - `web` giữ `state` và `code_verifier` trong cookie httpOnly ngắn hạn.
   - `identity-service` giữ client secret, đổi `code` lấy token và xác minh ID token (`aud`, `iss`, `email_verified`).
   - Email Google trùng email staff thì bị từ chối (`member.google_not_allowed`).
   - Tạo tài khoản mới bằng Google cần ô đồng ý (BR-06).
4. **Token tách đối tượng:** `aud = lavieco:member` cho member, `lavieco:staff` cho staff. Mọi endpoint cần permission từ chối token member. `admin` chỉ giữ token staff; `web` chỉ refresh phiên member.
5. Cookie phiên: member `SameSite=Lax` (để đến từ link email hay redirect Google vẫn nhận ra), staff `SameSite=Strict`.
6. Gắn đơn cũ khi tạo tài khoản: `identity` ghi outbox `member.email_verified` (chỉ ID) → `program-service` gắn đơn theo email (làm ở Phase 6, khi `program-service` có đơn).

## Hệ quả

- Thêm collection `otp_codes`, `rate_limit_buckets`; `users` thêm `googleSub`, `emailVerifiedAt`, `consent` (`docs/03` §4).
- Refresh token xoay vòng nghiêm ngặt. Hai tab cùng refresh một lúc có thể bị coi là dùng lại và đăng xuất cả họ phiên. Chấp nhận ở GĐ1; nếu thành vấn đề thì thêm khoảng ân hạn ngắn.
