# ADR-019: Phiên bản và công cụ của service backend

| | |
|---|---|
| **Trạng thái** | Đã chấp nhận (17/10/2026) |
| **Ngày** | 17/10/2026 |
| **Người đề xuất** | V.C. Trọng |
| **Liên quan** | ADR-003 (NestJS + Mongoose), ADR-012, `docs/04` §6, §9, PQ4 |

## Bối cảnh

Khi dựng `service-kit` và `identity-service`, NestJS mới nhất (12.x) đã chỉ phát hành ESM. Trong khi đó ADR-012 giả định service chạy CJS. Cần chốt bộ công cụ để test có decorator metadata và để OpenAPI sinh từ Zod.

## Quyết định

| Chủ đề | Chọn | Lý do |
|---|---|---|
| Framework | **NestJS 11** (CJS) | Ổn định, khớp ADR-012. Chuyển sang Nest 12 (ESM) là một thay đổi riêng sau GĐ1. |
| ODM | **Mongoose 8** | `@nestjs/mongoose` 11 hỗ trợ. Mongoose 9 để sau. |
| JWT | **jose 5** | Có cả CJS lẫn ESM (jose 6 chỉ ESM). |
| Mật khẩu | **`@node-rs/argon2`** (Argon2id, 19 MiB, t=2, p=1) | Không cần node-gyp. |
| TOTP | Tự cài đặt RFC 6238 (~40 dòng, có test với vector chuẩn) | Tránh phụ thuộc cho một hàm nhỏ. |
| Test | **Vitest** + `unplugin-swc` | esbuild không phát decorator metadata. |
| Test tích hợp | **Testcontainers** (`mongo:8.0` replica set) | Mặc định của `docs/04` §6.1 (PQ4 vẫn mở). |
| OpenAPI | `@nestjs/swagger` + `z.toJSONSchema(target: openapi-3.0)` qua `@ZodBody`, `@ApiZodResponse` | Một nguồn sự thật (Zod), không viết tay. |
| Migration | Script `src/cli/migrate.ts` + file `migrations/*.cjs` | Đơn giản, idempotent, ghi `migrations_applied`. |
| Logger | `pino` sau lớp che dữ liệu nhạy cảm của `@lavieco/observability` | |

## Hệ quả

- Lớp `application/` không import Nest/Mongoose. Use case là class thuần, được nối bằng `useFactory` trong `<module>.module.ts`. Port giao dịch, outbox, email lấy từ `@lavieco/service-kit/ports` (chỉ có kiểu).
- Đăng ký model Mongoose (`MongooseModule.forFeature`) đặt trong `infrastructure/*.model.ts` (luật S1).

## Điều kiện xem lại

Mở lại ADR này (và cân nhắc NestJS 12 / ESM) khi xảy ra **một trong hai**:

1. NestJS 11 **hết hỗ trợ bảo mật** (không còn bản vá bảo mật).
2. Repo **chuyển sang ESM** cho service (khi đó cập nhật cả ADR-012).
