# Runbook: chạy hệ thống trên máy dev

Áp dụng từ Phase 1 (17/10/2026): `identity-service`, `web`, `admin`; từ Phase 2 (18/10/2026) thêm `program-service`. Giá trị thật chỉ nằm trong các tệp `.env.local` (gitignore); **không commit, không dán vào chat/issue**.

## 1. Chuẩn bị

1. Node 24 (`.nvmrc`), Docker Desktop đang chạy.
2. `npm install`, rồi `npm run env:init` để tạo các `.env.local` từ `.env.example` (không ghi đè tệp đã có).
3. Ở `.env.local` gốc repo: đặt `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` (giá trị bất kỳ cho máy dev). Nếu cổng 27017 đã có MongoDB khác dùng, đặt `MONGO_PORT=27018` và sửa `MONGODB_URI` của service theo cổng đó.

### 1.1 Mỗi khi pull code mới: `npm run env:check`

Phase mới thường thêm biến môi trường. Sau mỗi lần pull, chạy:

```
npm run env:check            # so mọi .env.local với .env.example, chỉ in TÊN biến thiếu/trống
npm run env:check -- --fix   # thêm biến thiếu có giá trị mặc định trong .env.example (không ghi đè biến đã có)
```

Biến thiếu mà `.env.example` để trống (khóa, secret) phải tự điền theo mục 2. Lệnh trả mã lỗi 1 khi còn biến thiếu. Ví dụ lỗi `Invalid server environment: PROGRAM_SERVICE_URL` khi `npm run dev` nghĩa là quên bước này.

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
| `services/program-service` | `SERVICE_TOKEN_TRUSTED_KEYS` | giống của `identity-service`: `{"web": <PUBLIC_JWK của web>, "admin": <PUBLIC_JWK của admin>}` |
| | `REVALIDATE_SECRET` | một giá trị `RANDOM_32B` (dùng chung với `web`) |
| | `IDENTITY_JWKS_URL`, `WEB_APP_URL` | giữ mặc định trong `.env.example` |
| `apps/web` | `SERVICE_TOKEN_PRIVATE_JWK` | `<PRIVATE_JWK của web>` |
| | `REVALIDATE_SECRET` | **cùng giá trị** với `program-service` |
| | `PROGRAM_SERVICE_URL`, `ADMIN_APP_URL` | giữ mặc định (`ADMIN_APP_URL` là origin duy nhất được nhúng trang xem trước) |
| `apps/admin` | `SERVICE_TOKEN_PRIVATE_JWK` | `<PRIVATE_JWK của admin>` |
| | `PROGRAM_SERVICE_URL`, `WEB_APP_URL` | giữ mặc định |

Khóa riêng (có trường `"d"`) chỉ nằm ở đúng một nơi. Service từ chối nếu `SERVICE_TOKEN_TRUSTED_KEYS` chứa khóa riêng.

## 3. Chạy

```
npm run dev:infra                                      # Mongo replica set, MinIO, Mailpit
npm run db:migrate -w @lavieco/identity-service        # tạo index (idempotent, chạy lại an toàn)
npm run build -w @lavieco/program-service && npm run db:migrate -w @lavieco/program-service   # index + seed loại chương trình (idempotent)
npm run dev                                            # web :3000, admin :3001, identity :4001, program :4004
```

- Email (mã OTP, thông báo) xem ở Mailpit: http://localhost:8025
- Super Admin đầu tiên: `npm run admin:create -- --email <email> --name "<tên>"`. Lệnh in ra link kích hoạt dùng một lần (48 giờ). Mở link, quét QR bằng ứng dụng xác thực, đặt mật khẩu, lưu 10 mã khôi phục.
- Google sign-in (tuỳ chọn): đặt `GOOGLE_CLIENT_ID` ở cả `web` và `identity-service`, `GOOGLE_CLIENT_SECRET` chỉ ở `identity-service`, redirect URI `http://localhost:3000/api/auth/google/callback` (phải khớp với Google Console).

## 4. Kiểm tra

```
npm run lint && npm run typecheck && npm run test && npm run deps:check
npm run test:int -w @lavieco/identity-service          # cần Docker (Testcontainers)
npm run test:int -w @lavieco/program-service           # cần Docker (Testcontainers)
npm run gen:openapi                                    # sinh docs/api/*.openapi.json
```

## 5. Dừng

`npm run dev:infra:down` (dữ liệu Mongo được giữ trong volume `lavieco-dev_mongo-data`).
