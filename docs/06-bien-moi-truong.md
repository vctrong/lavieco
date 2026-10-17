# 06 — Biến môi trường

Danh sách **toàn bộ** biến môi trường của monorepo, theo từng app/service. Giá trị thật chỉ nằm trong các tệp `.env.local` (gitignore) hoặc kho bí mật của môi trường triển khai, **không bao giờ commit, không dán vào chat/issue/PR**. Mọi ví dụ trong tài liệu này là **giá trị giả**.

## Checklist mỗi khi pull code mới

1. `npm run env:check` để so mọi `.env.local` với `.env.example`. Lệnh chỉ in **tên** biến thiếu hoặc trống, không in giá trị.
2. `npm run env:check -- --fix` để thêm các biến thiếu có giá trị mặc định (không ghi đè biến đã có).
3. Điền những biến còn trống theo bảng dưới đây (cột "Cách lấy").
4. **Tắt hẳn** `npm run dev` (Ctrl+C) rồi chạy lại. Next.js và service chỉ đọc env lúc khởi động; `NEXT_PUBLIC_*` được nhúng vào bundle lúc build.

## Quy tắc khi thêm, đổi tên hoặc xoá biến

Trong **cùng một commit**, cập nhật cả ba nơi:

1. Schema env của project: `src/config/env.ts` (service), `src/lib/env.ts` / `src/lib/env.public.ts` (app). Đây là nơi `env:check` và lúc khởi động kiểm tra.
2. `.env.example` tương ứng (không có giá trị thật).
3. Tài liệu này: bảng của project, mục "Biến liên quan giữa các service" nếu có, và "Lịch sử thay đổi".

`npm run env:check` cảnh báo khi một biến có trong `.env.example` mà chưa được nhắc trong tài liệu này.

Cột **Bắt buộc**: "Bắt buộc" nghĩa là project từ chối khởi động khi thiếu hoặc sai. "Tuỳ chọn (mặc định …)" nghĩa là có thể bỏ trống. Cột **Bí mật**: "Có" nghĩa là lộ giá trị thì phải xoay (đổi) ngay.

## Biến liên quan giữa các service

### Service token (ADR-018)

Mỗi bên gọi có **một cặp khoá Ed25519** sinh bằng `npm run keys:generate -w @lavieco/identity-service -- <tên bên gọi>`:

- **Khoá riêng** (JWK có trường `"d"`) chỉ nằm ở **đúng một nơi**: `SERVICE_TOKEN_PRIVATE_JWK` của chính bên gọi.
- **Khoá công khai** (JWK không có `"d"`) được chép vào `SERVICE_TOKEN_TRUSTED_KEYS` của **mỗi service mà bên đó gọi**, dưới khoá là tên bên gọi.
- **Không bao giờ chép khoá riêng sang service khác.** Service từ chối khởi động nếu `SERVICE_TOKEN_TRUSTED_KEYS` chứa khoá riêng.

| Bên gọi (giữ khoá riêng) | Khoá công khai phải có trong `SERVICE_TOKEN_TRUSTED_KEYS` của |
|---|---|
| `apps/web` (`"web"`) | `identity-service`, `program-service` |
| `apps/admin` (`"admin"`) | `identity-service`, `program-service` |
| `program-service` (`"program-service"`) | `content-service` (gắn/giải phóng ảnh), `identity-service` (ghi audit qua outbox, ADR-021) |

Lời gọi thay mặt người dùng (avatar của member, tải ảnh của staff) dùng **token người dùng**, không dùng service token, nên `content-service` không cần khoá của `web`/`admin`.

Ví dụ `SERVICE_TOKEN_TRUSTED_KEYS` của `program-service`: `'{"web": <JWK công khai của web>, "admin": <JWK công khai của admin>}'` (bọc cả chuỗi JSON trong dấu nháy đơn).

### Token người dùng và JWKS

- `identity-service` ký token người dùng bằng `JWT_SIGNING_KEYS` (khoá riêng, chỉ ở identity) và công bố khoá công khai tại `/.well-known/jwks.json`.
- `IDENTITY_JWKS_URL` của `program-service` và `content-service` trỏ về JWKS này: dev `http://127.0.0.1:4001/.well-known/jwks.json`, prod là địa chỉ **mạng riêng** của identity (không qua Internet).

### Giá trị phải giống nhau giữa hai nơi

| Biến | Ở đâu | Ghi chú |
|---|---|---|
| `REVALIDATE_SECRET` | `apps/web` **và** `program-service` | Cùng một giá trị; HMAC của webhook `/api/revalidate`. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_REDIRECT_URI` | `apps/web` **và** `identity-service` | Cùng giá trị; `GOOGLE_CLIENT_SECRET` chỉ ở identity. |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (web, admin) = `CLOUDINARY_CLOUD_NAME` (content-service) | 3 nơi | Cùng product environment (dev với dev, prod với prod). |
| URL nội bộ `*_SERVICE_URL` | app/service gọi | Phải trỏ đúng cổng: identity 4001, content 4002, program 4004. |

## Gốc repo: `.env.local`

Dùng cho `npm run dev:infra` (Docker Compose: MongoDB replica set, Mailpit). Không dùng ở production.

| Tên biến | Bắt buộc | Bí mật | Ý nghĩa | Cách lấy | Dev / Prod | Ví dụ giả |
|---|---|---|---|---|---|---|
| `MONGO_PORT` | Tuỳ chọn (mặc định `27017`) | Không | Cổng MongoDB trên máy dev | Tự đặt; đổi khi 27017 đã bị chiếm, nhớ sửa `MONGODB_URI` của các service | Chỉ dev | `27018` |
| `MAILPIT_SMTP_PORT` | Tuỳ chọn (mặc định `1025`) | Không | Cổng SMTP của Mailpit | Tự đặt | Chỉ dev | `1025` |
| `MAILPIT_UI_PORT` | Tuỳ chọn (mặc định `8025`) | Không | Giao diện xem email | Tự đặt | Chỉ dev | `8025` |

## `apps/web`: `apps/web/.env.local`

| Tên biến | Bắt buộc | Bí mật | Ý nghĩa | Cách lấy | Dev / Prod | Ví dụ giả |
|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Tuỳ chọn (mặc định `http://localhost:3000`) | Không (nhúng vào bundle) | Origin công khai, dùng cho metadata, Open Graph, canonical | Tự đặt | Prod: `https://lavieco.io.vn` | `http://localhost:3000` |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Tuỳ chọn (trống = dùng ảnh minh hoạ) | Không | Cloud name Cloudinary trong URL ảnh | Cloudinary Dashboard → API Keys → Cloud name | Dev và prod là **hai** product environment khác nhau | `demo-dev` |
| `IDENTITY_SERVICE_URL` | Bắt buộc | Không | identity-service trên mạng riêng | Tự đặt | Prod: địa chỉ nội bộ, không mở Internet | `http://127.0.0.1:4001` |
| `PROGRAM_SERVICE_URL` | Bắt buộc | Không | program-service trên mạng riêng | Tự đặt | Như trên | `http://127.0.0.1:4004` |
| `CONTENT_SERVICE_URL` | Bắt buộc | Không | content-service trên mạng riêng | Tự đặt | Như trên | `http://127.0.0.1:4002` |
| `SERVICE_TOKEN_PRIVATE_JWK` | Bắt buộc | **Có** | Khoá riêng Ed25519 của `web` để ký service token | `npm run keys:generate -w @lavieco/identity-service -- web` → `PRIVATE_JWK` | Mỗi môi trường một cặp khoá riêng | `'{"kty":"OKP","crv":"Ed25519","x":"GIA-x","d":"GIA-d"}'` |
| `GOOGLE_CLIENT_ID` | Tuỳ chọn (trống = ẩn nút Google) | Không | Đăng nhập Google cho member | Google Cloud Console → APIs & Services → Credentials → OAuth client | Dev và prod nên là hai OAuth client | `123-gia.apps.googleusercontent.com` |
| `GOOGLE_REDIRECT_URI` | Tuỳ chọn | Không | Redirect URI của luồng Google | Tự đặt, phải khớp Google Console và identity | Prod: `https://lavieco.io.vn/api/auth/google/callback` | `http://localhost:3000/api/auth/google/callback` |
| `TURNSTILE_ENABLED` | Tuỳ chọn (mặc định `false`) | Không | Bật Cloudflare Turnstile cho form công khai | Tự đặt | Chưa bật ở GĐ1 (TODO) | `false` |
| `TURNSTILE_SITE_KEY` | Tuỳ chọn | Không | Site key Turnstile | Cloudflare Dashboard → Turnstile → site | Mỗi tên miền một site | `0x4AAAA-gia` |
| `TURNSTILE_SECRET_KEY` | Tuỳ chọn | **Có** | Secret Turnstile | Cloudflare Dashboard → Turnstile → site → Secret key | Như trên | `0x4AAAA-gia-secret` |
| `REVALIDATE_SECRET` | Tuỳ chọn (trống = `/api/revalidate` từ chối mọi lời gọi) | **Có** | HMAC webhook làm mới cache | Giá trị `RANDOM_32B` của `keys:generate`; **cùng giá trị** với `program-service` | Khác nhau giữa dev và prod | `R2lBLWdpYS1naWEtZ2lhLWdpYS1naWEtZ2lhLWdpYQ==` |
| `ADMIN_APP_URL` | Tuỳ chọn (trống = chặn nhúng) | Không | Origin duy nhất được nhúng trang xem trước | Tự đặt | Prod: origin của admin | `http://localhost:3001` |
| `LOG_LEVEL` | Tuỳ chọn (mặc định `info`) | Không | Mức log | Tự đặt | Prod: `info` | `debug` |

## `apps/admin`: `apps/admin/.env.local`

| Tên biến | Bắt buộc | Bí mật | Ý nghĩa | Cách lấy | Dev / Prod | Ví dụ giả |
|---|---|---|---|---|---|---|
| `IDENTITY_SERVICE_URL` | Bắt buộc | Không | identity-service trên mạng riêng | Tự đặt | Prod: địa chỉ nội bộ | `http://127.0.0.1:4001` |
| `PROGRAM_SERVICE_URL` | Bắt buộc | Không | program-service trên mạng riêng | Tự đặt | Như trên | `http://127.0.0.1:4004` |
| `CONTENT_SERVICE_URL` | Bắt buộc | Không | content-service (tải ảnh chương trình) | Tự đặt | Như trên | `http://127.0.0.1:4002` |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Tuỳ chọn | Không | Cloud name trong URL ảnh | Cloudinary Dashboard → API Keys | Dev/prod hai environment | `demo-dev` |
| `WEB_APP_URL` | Bắt buộc | Không | Origin của `web`, để nhúng trang xem trước | Tự đặt | Prod: `https://lavieco.io.vn` | `http://localhost:3000` |
| `SERVICE_TOKEN_PRIVATE_JWK` | Bắt buộc | **Có** | Khoá riêng Ed25519 của `admin` | `npm run keys:generate -w @lavieco/identity-service -- admin` → `PRIVATE_JWK` | Mỗi môi trường một cặp | `'{"kty":"OKP","crv":"Ed25519","x":"GIA-x","d":"GIA-d"}'` |
| `LOG_LEVEL` | Tuỳ chọn (mặc định `info`) | Không | Mức log | Tự đặt | | `info` |

## `identity-service`: `services/identity-service/.env.local`

| Tên biến | Bắt buộc | Bí mật | Ý nghĩa | Cách lấy | Dev / Prod | Ví dụ giả |
|---|---|---|---|---|---|---|
| `NODE_ENV` | Tuỳ chọn (mặc định `development`) | Không | Môi trường | Tự đặt | Prod: `production` | `development` |
| `PORT` | Bắt buộc | Không | Cổng HTTP | Tự đặt | | `4001` |
| `LOG_LEVEL` | Tuỳ chọn (mặc định `info`) | Không | Mức log | Tự đặt | | `info` |
| `MONGODB_URI` | Bắt buộc | **Có** (prod chứa mật khẩu) | Chuỗi kết nối MongoDB | Dev: mặc định compose. Prod: Atlas → Database → Connect → Drivers, user `svc_identity` | Dev **không bao giờ** trỏ vào database production (docs/04 §11.1) | `mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true` |
| `MONGODB_DB` | Bắt buộc | Không | Tên database | Tự đặt | Dev trên Atlas: hậu tố `_dev`; prod: không có `_dev` | `lavieco_identity` |
| `SERVICE_TOKEN_TRUSTED_KEYS` | Tuỳ chọn (mặc định `{}`) | Không (chỉ khoá công khai) | Khoá công khai của `web`, `admin`, `program-service` | Mục "Service token" ở trên | | `'{"web": {...}, "admin": {...}, "program-service": {...}}'` |
| `JWT_SIGNING_KEYS` | Bắt buộc | **Có** | Mảng JSON khoá riêng ký token người dùng; khoá đầu ký | `npm run keys:generate -w @lavieco/identity-service -- identity-service` → `PRIVATE_JWK`, đặt trong `[ ]` | Xoay khoá: thêm khoá mới lên đầu, giữ khoá cũ tới khi token cũ hết hạn | `'[{"kty":"OKP","crv":"Ed25519","x":"GIA","d":"GIA","kid":"k1"}]'` |
| `TOTP_ENCRYPTION_KEY` | Bắt buộc | **Có** | Khoá AES-256-GCM mã hoá bí mật TOTP | `RANDOM_32B` của `keys:generate` | Khác nhau từng môi trường; đổi là mất mọi 2FA đã cài | `VE9UUC1naWEtZ2lhLWdpYS1naWEtZ2lhLWdpYS0xMg==` |
| `OTP_PEPPER` | Bắt buộc | **Có** | Pepper HMAC cho mã OTP và khoá giới hạn tần suất | `RANDOM_32B` của `keys:generate` | Khác nhau từng môi trường | `T1RQLWdpYS1naWEtZ2lhLWdpYS1naWEtZ2lhLWdpYQ==` |
| `STAFF_ACCESS_TTL_SECONDS` | Tuỳ chọn (mặc định `600`) | Không | Hạn access token staff | Tự đặt | | `600` |
| `MEMBER_ACCESS_TTL_SECONDS` | Tuỳ chọn (mặc định `900`) | Không | Hạn access token member | Tự đặt | | `900` |
| `STAFF_REFRESH_TTL_HOURS` | Tuỳ chọn (mặc định `12`) | Không | Hạn refresh token staff | Tự đặt | | `12` |
| `MEMBER_REFRESH_TTL_DAYS` | Tuỳ chọn (mặc định `30`) | Không | Hạn refresh token member | Tự đặt | | `30` |
| `ADMIN_APP_URL` | Bắt buộc | Không | Origin admin, dùng trong link mời | Tự đặt | Prod: origin admin thật | `http://localhost:3001` |
| `WEB_APP_URL` | Bắt buộc | Không | Origin web, dùng trong email member | Tự đặt | Prod: `https://lavieco.io.vn` | `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` | Tuỳ chọn | Không | Đăng nhập Google (member) | Google Cloud Console → Credentials | Cùng giá trị với `web` | `123-gia.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Tuỳ chọn | **Có** | Client secret Google, **chỉ ở identity** | Google Cloud Console → Credentials → OAuth client → Client secret | Dev/prod hai client | `GOCSPX-gia` |
| `GOOGLE_REDIRECT_URI` | Tuỳ chọn | Không | Redirect URI duy nhất được chấp nhận | Tự đặt, khớp `web` và Google Console | | `http://localhost:3000/api/auth/google/callback` |
| `MAIL_PROVIDER` | Tuỳ chọn (mặc định `smtp`) | Không | Nhà cung cấp email (AQ8) | Tự đặt | | `smtp` |
| `SMTP_HOST` | Bắt buộc | Không | Máy chủ SMTP | Dev: Mailpit `127.0.0.1`. Prod: nhà cung cấp email (AQ8) | | `127.0.0.1` |
| `SMTP_PORT` | Bắt buộc | Không | Cổng SMTP | Dev `1025` | Prod thường `587` | `1025` |
| `SMTP_SECURE` | Tuỳ chọn (mặc định `false`) | Không | TLS trực tiếp (cổng 465) | Tự đặt | | `false` |
| `SMTP_USER` | Tuỳ chọn | Không | Tài khoản SMTP | Dashboard nhà cung cấp email | Dev để trống | `apikey` |
| `SMTP_PASS` | Tuỳ chọn | **Có** | Mật khẩu/API key SMTP | Dashboard nhà cung cấp email | Dev để trống | `gia-smtp-pass` |
| `MAIL_FROM` | Bắt buộc | Không | Người gửi | Tự đặt | | `"LAVIECO <no-reply@lavieco.io.vn>"` |

## `content-service`: `services/content-service/.env.local`

| Tên biến | Bắt buộc | Bí mật | Ý nghĩa | Cách lấy | Dev / Prod | Ví dụ giả |
|---|---|---|---|---|---|---|
| `NODE_ENV` | Tuỳ chọn (mặc định `development`) | Không | Môi trường; quyết định folder ảnh `lavieco/dev` hay `lavieco/prod` | Tự đặt | Prod: `production` | `development` |
| `PORT` | Bắt buộc | Không | Cổng HTTP | Tự đặt | | `4002` |
| `LOG_LEVEL` | Tuỳ chọn (mặc định `info`) | Không | Mức log | Tự đặt | | `info` |
| `MONGODB_URI` | Bắt buộc | **Có** (prod) | Chuỗi kết nối MongoDB | Như identity, user `svc_content` | Dev không trỏ production | `mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true` |
| `MONGODB_DB` | Bắt buộc | Không | Tên database | Tự đặt | Atlas dev: `lavieco_content_dev` | `lavieco_content` |
| `SERVICE_TOKEN_TRUSTED_KEYS` | Tuỳ chọn (mặc định `{}`) | Không | Khoá công khai của `program-service` (sau này cả `identity-service`, UC-29) | Mục "Service token" | | `'{"program-service": {...}}'` |
| `IDENTITY_JWKS_URL` | Bắt buộc | Không | JWKS của identity | Tự đặt | Prod: địa chỉ nội bộ | `http://127.0.0.1:4001/.well-known/jwks.json` |
| `CLOUDINARY_CLOUD_NAME` | Bắt buộc | Không | Cloud name | Cloudinary Dashboard → API Keys | **Product environment riêng** cho dev và prod | `demo-dev` |
| `CLOUDINARY_API_KEY` | Bắt buộc | Không (nhưng đừng công bố) | API key | Cloudinary Dashboard → API Keys | Như trên | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Bắt buộc | **Có** | API secret, chỉ ở content-service | Cloudinary Dashboard → API Keys → API Secret | Như trên | `gia-cloudinary-secret` |

## `program-service`: `services/program-service/.env.local`

| Tên biến | Bắt buộc | Bí mật | Ý nghĩa | Cách lấy | Dev / Prod | Ví dụ giả |
|---|---|---|---|---|---|---|
| `NODE_ENV` | Tuỳ chọn (mặc định `development`) | Không | Môi trường | Tự đặt | Prod: `production` | `development` |
| `PORT` | Bắt buộc | Không | Cổng HTTP | Tự đặt | | `4004` |
| `LOG_LEVEL` | Tuỳ chọn (mặc định `info`) | Không | Mức log | Tự đặt | | `info` |
| `MONGODB_URI` | Bắt buộc | **Có** (prod) | Chuỗi kết nối MongoDB | Như identity, user `svc_program` | Dev không trỏ production | `mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true` |
| `MONGODB_DB` | Bắt buộc | Không | Tên database | Tự đặt | Atlas dev: `lavieco_program_dev` | `lavieco_program` |
| `SERVICE_TOKEN_TRUSTED_KEYS` | Tuỳ chọn (mặc định `{}`) | Không | Khoá công khai của `web`, `admin` | Mục "Service token" | | `'{"web": {...}, "admin": {...}}'` |
| `IDENTITY_JWKS_URL` | Bắt buộc | Không | JWKS của identity | Tự đặt | Prod: địa chỉ nội bộ | `http://127.0.0.1:4001/.well-known/jwks.json` |
| `CONTENT_SERVICE_URL` | Bắt buộc | Không | content-service (gắn/giải phóng ảnh) | Tự đặt | Prod: địa chỉ nội bộ | `http://127.0.0.1:4002` |
| `SERVICE_TOKEN_PRIVATE_JWK` | Bắt buộc | **Có** | Khoá riêng Ed25519 của program-service | `npm run keys:generate -w @lavieco/identity-service -- program-service` → `PRIVATE_JWK` | Mỗi môi trường một cặp | `'{"kty":"OKP","crv":"Ed25519","x":"GIA-x","d":"GIA-d"}'` |
| `WEB_APP_URL` | Bắt buộc | Không | Origin của `web`: webhook làm mới cache, link vé trong email, `returnUrl`/`cancelUrl` của payOS | Tự đặt; khi test payOS qua tunnel đặt bằng URL tunnel | Prod: `https://lavieco.io.vn` | `http://localhost:3000` |
| `REVALIDATE_SECRET` | Bắt buộc | **Có** | HMAC webhook làm mới cache, **cùng giá trị** với `web` | `RANDOM_32B` của `keys:generate` | Khác nhau giữa dev và prod | `R2lBLWdpYS1naWEtZ2lhLWdpYS1naWEtZ2lhLWdpYQ==` |
| `TICKET_LINK_SECRET` | Bắt buộc | **Có** | Khoá HMAC của link đơn/vé trong email (`/ve/[token]`, trang thanh toán, huỷ đơn) | `RANDOM_32B` của `keys:generate` | Khác nhau giữa dev và prod. **Đổi giá trị là mọi link vé đã gửi hết hiệu lực** | `VElDS0VULWdpYS1naWEtZ2lhLWdpYS1naWEtZ2lhLTE=` |
| `MAIL_PROVIDER` | Tuỳ chọn (mặc định `smtp`) | Không | Nhà cung cấp email vé (AQ8) | Tự đặt | | `smtp` |
| `SMTP_HOST` | Bắt buộc | Không | Máy chủ SMTP gửi email vé | Dev: Mailpit `127.0.0.1`. Prod: nhà cung cấp email (AQ8) | | `127.0.0.1` |
| `SMTP_PORT` | Bắt buộc | Không | Cổng SMTP | Dev `1025` | Prod thường `587` | `1025` |
| `SMTP_SECURE` | Tuỳ chọn (mặc định `false`) | Không | TLS trực tiếp (cổng 465) | Tự đặt | | `false` |
| `SMTP_USER` | Tuỳ chọn | Không | Tài khoản SMTP | Dashboard nhà cung cấp email | Dev để trống | `apikey` |
| `SMTP_PASS` | Tuỳ chọn | **Có** | Mật khẩu/API key SMTP | Dashboard nhà cung cấp email | Dev để trống | `gia-smtp-pass` |
| `MAIL_FROM` | Bắt buộc | Không | Người gửi email vé | Tự đặt | | `"LAVIECO <no-reply@lavieco.io.vn>"` |
| `PAYOS_CLIENT_ID` | Tuỳ chọn (trống = tắt payOS; đủ cả ba mới bật) | Không (nhưng đừng công bố) | Client ID của kênh thanh toán payOS | my.payos.vn → Kênh thanh toán → chọn kênh → Thông tin tích hợp | **Kênh riêng** cho dev và prod (`docs/runbooks/payos.md`) | `gia-client-id-0000` |
| `PAYOS_API_KEY` | Tuỳ chọn (như trên) | **Có** | API key gọi payOS (tạo link, đối soát, huỷ link) | Như trên | Như trên | `gia-api-key-0000` |
| `PAYOS_CHECKSUM_KEY` | Tuỳ chọn (như trên) | **Có** | Khoá HMAC xác minh chữ ký webhook; **chỉ ở program-service** | Như trên | Như trên; lộ thì đổi ngay trên my.payos.vn | `gia-checksum-key-0000` |

## Lịch sử thay đổi

| Ngày | Biến | Thay đổi | Phase / nhánh |
|---|---|---|---|
| 17/10/2026 | Toàn bộ biến của root, `web`, `admin`, `identity-service` | Thêm | Phase 1, `feat/phase1-foundation-auth` |
| 18/10/2026 | `program-service`: tất cả; `web`/`admin`: `PROGRAM_SERVICE_URL`; `web`: `REVALIDATE_SECRET`, `ADMIN_APP_URL`; `admin`: `WEB_APP_URL` | Thêm | Phase 2, `feat/phase2-events` |
| 18/10/2026 | `content-service`: tất cả; `web`/`admin`: `CONTENT_SERVICE_URL`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`; `program-service`: `CONTENT_SERVICE_URL`, `SERVICE_TOKEN_PRIVATE_JWK` | Thêm | Phase 2b, `feat/phase2b-media` |
| 18/10/2026 | Root: biến MinIO | Xoá (ADR-020) | Phase 2b, `feat/phase2b-media` |
| 17/10/2026 | (tài liệu này được tạo, chưa đổi biến) | | Phase 3, `feat/phase3-registration-payos` |
| 17/10/2026 | `identity-service`: `SERVICE_TOKEN_TRUSTED_KEYS` phải có thêm khoá công khai `"program-service"` | Đổi nội dung (không đổi tên) | Phase 3, `feat/phase3-registration-payos` |
| 17/10/2026 | `program-service`: `TICKET_LINK_SECRET`, `MAIL_PROVIDER`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Thêm (email vé, link vé ký HMAC) | Phase 3, `feat/phase3-registration-payos` |
| 17/10/2026 | `program-service`: `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` | Thêm (payOS, ADR-015) | Phase 3, `feat/phase3-registration-payos` |
