# Runbook: chạy hệ thống trên máy dev

Áp dụng từ Phase 1 (17/10/2026): `identity-service`, `web`, `admin`; từ Phase 2 (18/10/2026) thêm `program-service`; từ Phase 2b thêm `content-service` (ảnh, Cloudinary). Giá trị thật chỉ nằm trong các tệp `.env.local` (gitignore); **không commit, không dán vào chat/issue**.

## 1. Chuẩn bị

1. Node 24 (`.nvmrc`), Docker Desktop đang chạy.
2. `npm install`, rồi `npm run env:init` để tạo các `.env.local` từ `.env.example` (không ghi đè tệp đã có).
3. Nếu cổng 27017 đã có MongoDB khác dùng, đặt `MONGO_PORT=27018` ở `.env.local` gốc repo và sửa `MONGODB_URI` của service theo cổng đó. Không còn MinIO: ảnh dùng Cloudinary dev (mục 2.1).

### 1.0 Database: dev không bao giờ trỏ vào production

- **Mặc định:** mọi service dùng Mongo trong compose, đúng như `.env.example` (`mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true`, `MONGODB_DB=lavieco_<service>`).
- **Nếu cần Atlas khi dev** (ví dụ máy yếu không chạy Docker): chỉ dùng database có hậu tố `_dev` (`lavieco_identity_dev`, `lavieco_program_dev`, `lavieco_content_dev`) với **một user Atlas riêng chỉ có quyền trên các database `*_dev`**. Không dùng user `svc_*` của production trên máy dev.
- Service từ chối khởi động (`invalid environment ... MONGODB_DB`) khi ngoài production mà `MONGODB_URI` trỏ `*.mongodb.net` với database không có hậu tố `_dev`; production từ chối database `_dev`. `npm run env:check` báo cùng lỗi, chỉ in tên biến.
- Đã từng trỏ dev vào Atlas production: đổi `MONGODB_URI`/`MONGODB_DB` trong `.env.local` về compose (hoặc `*_dev`), rồi **xoay mật khẩu user Atlas production** đã từng nằm trên máy dev.

### 1.1 Mỗi khi pull code mới: `npm run env:check`

Phase mới thường thêm biến môi trường. Sau mỗi lần pull, chạy:

```
npm run env:check            # so mọi .env.local với .env.example, chỉ in TÊN biến thiếu/trống
npm run env:check -- --fix   # thêm biến thiếu có giá trị mặc định trong .env.example (không ghi đè biến đã có)
```

Biến thiếu mà `.env.example` để trống (khóa, secret) phải tự điền theo mục 2. Lệnh còn báo `MONGODB_DB` khi dev đang trỏ Atlas mà database không có hậu tố `_dev` (mục 1.0). Lệnh trả mã lỗi 1 khi còn vấn đề. Ví dụ lỗi `Invalid server environment: PROGRAM_SERVICE_URL` khi `npm run dev` nghĩa là quên bước này.

## 2. Sinh khóa

```
npm run build -w @lavieco/identity-service
npm run keys:generate -w @lavieco/identity-service -- identity-service
npm run keys:generate -w @lavieco/identity-service -- web
npm run keys:generate -w @lavieco/identity-service -- admin
npm run keys:generate -w @lavieco/identity-service -- program-service
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
| | `SERVICE_TOKEN_PRIVATE_JWK` | `<PRIVATE_JWK của program-service>` (gọi `content-service` để gắn/giải phóng ảnh) |
| | `CONTENT_SERVICE_URL` | giữ mặc định (`http://127.0.0.1:4002`) |
| `apps/web` | `SERVICE_TOKEN_PRIVATE_JWK` | `<PRIVATE_JWK của web>` |
| | `REVALIDATE_SECRET` | **cùng giá trị** với `program-service` |
| | `PROGRAM_SERVICE_URL`, `ADMIN_APP_URL` | giữ mặc định (`ADMIN_APP_URL` là origin duy nhất được nhúng trang xem trước) |
| | `CONTENT_SERVICE_URL`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | mặc định; cloud name **dev** (mục 2.1, trống thì web dùng ảnh minh hoạ) |
| `apps/admin` | `SERVICE_TOKEN_PRIVATE_JWK` | `<PRIVATE_JWK của admin>` |
| | `PROGRAM_SERVICE_URL`, `WEB_APP_URL`, `CONTENT_SERVICE_URL` | giữ mặc định |
| | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | cloud name **dev** (mục 2.1) |

| `services/content-service` | `SERVICE_TOKEN_TRUSTED_KEYS` | `{"program-service": <PUBLIC_JWK của program-service>}` (sinh bằng `keys:generate -- program-service`) |
| | `CLOUDINARY_*` | khoá của product environment **dev** (mục 2.1) |

Khóa riêng (có trường `"d"`) chỉ nằm ở đúng một nơi. Service từ chối nếu `SERVICE_TOKEN_TRUSTED_KEYS` chứa khóa riêng.

### 2.1 Cloudinary (ảnh, ADR-020)

1. Dùng **product environment (hoặc tài khoản) Cloudinary riêng cho dev**, không bao giờ dùng khoá của prod trên máy dev (khoá Cloudinary có quyền trên cả tài khoản, không giới hạn được theo folder).
2. Lấy `Cloud name`, `API key`, `API secret` ở Dashboard → API Keys, điền vào `services/content-service/.env.local` (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`). Không dán vào chat/issue.
3. Settings → Security: bật **Strict transformations** (chỉ named transformation được phép tạo ảnh, ảnh gốc không bao giờ phát ra).
4. Tạo các named transformation `t_lv_w96` … `t_lv_w1920` (idempotent, chạy lại khi danh sách đổi):

   ```
   npm run build -w @lavieco/content-service && npm run media:setup -w @lavieco/content-service
   ```

5. Kiểm tra một lần sau khi tải một ảnh: `https://res.cloudinary.com/<cloud>/image/private/t_lv_w640/<publicId>` trả ảnh; `https://res.cloudinary.com/<cloud>/image/private/<publicId>` (ảnh gốc) và một transformation tự chế (ví dụ `w_2000`) **bị từ chối**.
   Lưu ý (kiểm chứng 17/10/2026 trên account dev): URL đã bị gọi khi transformation chưa tồn tại có thể bị CDN giữ lỗi `400 Unknown transformation` một lúc; thử bằng ảnh mới tải lên. Cloudinary bỏ `f_auto` khỏi định nghĩa named transformation (chỉ lưu `c_limit,w_…/q_auto`), và Strict chặn `t_lv_w…/f_auto`, nên ảnh hiện phát đúng định dạng gốc (`TODO(media-f-auto)`).
6. `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` của `web` và `admin` = cloud name dev (không bí mật). Ảnh dev nằm dưới folder `lavieco/dev`, prod dưới `lavieco/prod` (suy ra từ `NODE_ENV`).

## 3. Chạy

```
npm run dev:infra                                      # Mongo replica set, Mailpit
npm run db:migrate -w @lavieco/identity-service        # tạo index (idempotent, chạy lại an toàn)
npm run build -w @lavieco/program-service && npm run db:migrate -w @lavieco/program-service   # index + seed loại chương trình (idempotent)
npm run build -w @lavieco/content-service && npm run db:migrate -w @lavieco/content-service   # index của media, outbox (idempotent)
npm run dev                                            # web :3000, admin :3001, identity :4001, content :4002, program :4004
```

- Email (mã OTP, thông báo) xem ở Mailpit: http://localhost:8025
- Super Admin đầu tiên: `npm run admin:create -- --email <email> --name "<tên>"`. Lệnh in ra link kích hoạt dùng một lần (48 giờ). Mở link, quét QR bằng ứng dụng xác thực, đặt mật khẩu, lưu 10 mã khôi phục.
- Google sign-in (tuỳ chọn): đặt `GOOGLE_CLIENT_ID` ở cả `web` và `identity-service`, `GOOGLE_CLIENT_SECRET` chỉ ở `identity-service`, redirect URI `http://localhost:3000/api/auth/google/callback` (phải khớp với Google Console).

## 4. Kiểm tra

```
npm run lint && npm run typecheck && npm run test && npm run deps:check
npm run test:int -w @lavieco/identity-service          # cần Docker (Testcontainers)
npm run test:int -w @lavieco/program-service           # cần Docker (Testcontainers)
npm run test:int -w @lavieco/content-service           # cần Docker; ảnh lưu trong bộ nhớ, không gọi Cloudinary
npm run gen:openapi                                    # sinh docs/api/*.openapi.json
```

## 5. Dừng

`npm run dev:infra:down` (dữ liệu Mongo được giữ trong volume `lavieco-dev_mongo-data`).
