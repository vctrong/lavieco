# Runbook: chạy hệ thống trên máy dev

Áp dụng từ Phase 1 (17/10/2026): `identity-service`, `web`, `admin`. Giá trị thật chỉ nằm trong các tệp `.env.local` (gitignore); **không commit, không dán vào chat/issue**.

## 1. Chuẩn bị

1. Node 24 (`.nvmrc`), Docker Desktop đang chạy.
2. `npm install`, rồi `npm run env:init` để tạo các `.env.local` từ `.env.example` (không ghi đè tệp đã có).
3. Ở `.env.local` gốc repo: đặt `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` (giá trị bất kỳ cho máy dev). Nếu cổng 27017 đã có MongoDB khác dùng, đặt `MONGO_PORT=27018` và sửa `MONGODB_URI` của service theo cổng đó.

## 2. Sinh khóa

```
npm run build -w @lavieco/identity-service
npm run keys:generate -w @lavieco/identity-service -- identity-service
npm run keys:generate -w @lavieco/identity-service -- web
npm run keys:generate -w @lavieco/identity-service -- admin
```

Mỗi lệnh in ra một cặp khóa Ed25519 và hai giá trị ngẫu nhiên 32 byte. Đặt vào các tệp như sau:

| Tệp `.env.local` | Biến | Giá trị |
|---|---|---|
| `services/identity-service` | `JWT_SIGNING_KEYS` | `[<PRIVATE_JWK của identity-service>]`, bọc trong dấu nháy đơn |
| | `SERVICE_TOKEN_TRUSTED_KEYS` | `{"web": <PUBLIC_JWK của web>, "admin": <PUBLIC_JWK của admin>}`, bọc trong dấu nháy đơn |
| | `TOTP_ENCRYPTION_KEY`, `OTP_PEPPER` | hai giá trị `RANDOM_32B` |
| `apps/web` | `SERVICE_TOKEN_PRIVATE_JWK` | `<PRIVATE_JWK của web>` |
| `apps/admin` | `SERVICE_TOKEN_PRIVATE_JWK` | `<PRIVATE_JWK của admin>` |

Khóa riêng (có trường `"d"`) chỉ nằm ở đúng một nơi. Service từ chối nếu `SERVICE_TOKEN_TRUSTED_KEYS` chứa khóa riêng.

## 3. Chạy

```
npm run dev:infra                                      # Mongo replica set, MinIO, Mailpit
npm run db:migrate -w @lavieco/identity-service        # tạo index (idempotent, chạy lại an toàn)
npm run dev                                            # web :3000, admin :3001, identity :4001
```

- Email (mã OTP, thông báo) xem ở Mailpit: http://localhost:8025
- Super Admin đầu tiên: `npm run admin:create -- --email <email> --name "<tên>"`. Lệnh in ra link kích hoạt dùng một lần (48 giờ). Mở link, quét QR bằng ứng dụng xác thực, đặt mật khẩu, lưu 10 mã khôi phục.
- Google sign-in (tuỳ chọn): đặt `GOOGLE_CLIENT_ID` ở cả `web` và `identity-service`, `GOOGLE_CLIENT_SECRET` chỉ ở `identity-service`, redirect URI `http://localhost:3000/api/auth/google/callback` (phải khớp với Google Console).

## 4. Kiểm tra

```
npm run lint && npm run typecheck && npm run test && npm run deps:check
npm run test:int -w @lavieco/identity-service          # cần Docker (Testcontainers)
npm run gen:openapi                                    # sinh docs/api/*.openapi.json
```

## 5. Dừng

`npm run dev:infra:down` (dữ liệu Mongo được giữ trong volume `lavieco-dev_mongo-data`).
