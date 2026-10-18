# ADR-021: Step-up bằng TOTP và ghi audit từ service khác

| | |
|---|---|
| **Trạng thái** | Chấp nhận |
| **Ngày** | 17/10/2026 |
| **Người đề xuất** | V.C. Trọng |
| **Liên quan** | `docs/02` §9.2, §9.7, `docs/03` §4.4, ADR-016, ADR-017, ADR-018 |

## Bối cảnh

`docs/02` §9.2 yêu cầu xác thực lại (step-up) và ghi audit cho các thao tác nhạy cảm. Phase 3 có hai thao tác như vậy ở `program-service`: xuất Excel người đăng ký (`registration:export`, ADR-017) và "Đánh dấu đã hoàn tiền" (`order:refund`). Đến Phase 2b chưa có cơ chế step-up. `audit_events` nằm trong `lavieco_identity`, và chưa có đường cho service khác ghi vào.

Ở Phase 3, member đã đăng nhập và có email đã xác thực được bỏ qua bước OTP khi đặt vé (`docs/05` §2). Token member không mang email, nên `program-service` không tự biết email đó.

## Quyết định

1. **Step-up tối giản:**
   - `admin` gửi mã TOTP 6 số tới `POST /internal/v1/staff/step-up` của identity (`@RequireStaff`). Mã khôi phục không dùng được ở bước này.
   - Identity trả về token Ed25519 sống **5 phút**: `aud = lavieco:step-up`, `sub` = userId, `sid` = phiên hiện tại.
   - BFF gửi token qua header `x-step-up-token`. Service đích kiểm tra token bằng JWKS, rồi kiểm tra `sub` và `sid` **trùng** với access token đi kèm.
   - Thiếu hoặc sai token thì trả `403 auth.step_up_required`.
   - Không lưu token. Token dùng lại được trong 5 phút, cho cùng người và cùng phiên.
2. **Audit từ service khác:**
   - Service ghi job `audit.record` (chỉ ID và mã) vào **outbox của mình**, trong cùng giao dịch với thao tác.
   - Handler gọi `POST /internal/v1/audit-events` của identity (`@AllowServices("program-service")`, mở rộng danh sách khi cần).
   - Identity điền email của người thực hiện từ `userId`, rồi ghi vào `audit_events` (chỉ thêm).
   - `meta` không chứa PII.
3. **Bằng chứng email của member:**
   - `POST /internal/v1/members/me/email-proofs` (`@RequireMember`) cấp **cùng định dạng** bằng chứng như OTP: `aud = lavieco:email-verification`, gồm `email`, `purpose`, và thêm `uid`.
   - Chỉ cấp khi email đã xác thực.
   - Bên dùng bằng chứng (`program-service`) tự bảo đảm mỗi bằng chứng chỉ dùng **một lần**, bằng index unique trên `verificationId` (= `sub`).

## Hệ quả

- `program-service` kiểm tra mọi token của identity bằng JWKS (`TokenVerifier`), không gọi đồng bộ sang identity.
- Identity ngưng thì audit chỉ chậm, không mất (outbox thử lại).
- Lộ token step-up chỉ có tác dụng trong 5 phút, và chỉ đi cùng access token của đúng phiên đó.
