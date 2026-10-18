# ADR-018: Service token và khai báo quyền truy cập endpoint

| | |
|---|---|
| **Trạng thái** | Chấp nhận |
| **Ngày** | 17/10/2026 |
| **Người đề xuất** | V.C. Trọng |
| **Liên quan** | `docs/02` §6.3, §9.3, `docs/04` §6.3 (S4), `docs/05` §3 |

## Bối cảnh

`docs/05` đề xuất header bí mật dùng chung `INTERNAL_API_SECRET`. `docs/02` §6.3 đã chốt service token JWT ngắn hạn có `aud`. Ngoài ra luật S4 (mọi endpoint khai báo quyền, thiếu thì từ chối) cần một cách khai báo cho cả endpoint không gắn với người dùng.

## Quyết định

1. **Không dùng `INTERNAL_API_SECRET`.** Mỗi thành phần gọi service có một cặp khóa **Ed25519**:
   - Khóa riêng nằm ở bên gọi (`SERVICE_TOKEN_PRIVATE_JWK`).
   - Khóa công khai nằm ở bên được gọi (`SERVICE_TOKEN_TRUSTED_KEYS = { "<bên gọi>": <JWK công khai> }`).
   - Token có `iss` = bên gọi, `aud` = service đích, sống 60 giây. Service từ chối khóa riêng trong danh sách tin cậy.
2. Token người dùng do `identity-service` ký (Ed25519, khóa trong `JWT_SIGNING_KEYS`, **không lưu trong DB**), phát hành qua JWKS.
3. Mỗi route khai báo **đúng một** quy tắc (`@lavieco/service-kit`). Không khai báo thì guard chung từ chối:
   - `@RequirePermission(...)`: token staff có đủ các permission.
   - `@RequireStaff()`: token staff bất kỳ (hồ sơ của chính mình).
   - `@RequireMember()`: token member; handler phải lọc theo `userId` (chống IDOR).
   - `@AllowServices("web", ...)`: service token từ đúng bên gọi.
   - `@PublicEndpoint()`: chỉ health và JWKS (mạng riêng).
4. Khóa sinh bằng `npm run keys:generate -- <tên bên gọi>`. Xoay khóa: thêm khóa mới lên đầu danh sách, giữ khóa cũ tới khi token cũ hết hạn.

## Hệ quả

- Lộ một khóa riêng chỉ ảnh hưởng một bên gọi; thu hồi bằng cách gỡ khóa công khai khỏi cấu hình service.
- Test: token sai `aud`, sai khóa, sai bên gọi, token member ở endpoint staff đều bị từ chối (`service-kit` access.guard.spec, test tích hợp identity).
