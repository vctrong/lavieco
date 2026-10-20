# 06 — Biến môi trường

Danh sách **toàn bộ** biến môi trường của monorepo, theo từng app/service. Giá trị thật chỉ nằm trong các tệp `.env.local` (gitignore) hoặc kho bí mật của môi trường triển khai, **không bao giờ commit, không dán vào chat/issue/PR**. Mọi ví dụ trong tài liệu này là **giá trị giả**.

## Checklist mỗi khi pull code mới

1. `npm run env:check` để so mọi `.env.local` với `.env.example`. Lệnh chỉ in **tên** biến thiếu hoặc trống, không in giá trị, và cho biết mỗi service gửi email qua Mailpit hay SMTP thật.
2. `npm run env:check -- --fix` để thêm các biến thiếu có giá trị mặc định (không ghi đè biến đã có).
3. Điền những biến còn trống theo bảng dưới đây (cột "Cách lấy").
4. **Tắt hẳn** `npm run dev` (Ctrl+C) rồi chạy lại. Next.js và service chỉ đọc env lúc khởi động; `NEXT_PUBLIC_*` được nhúng vào bundle lúc build.

## Quy tắc khi thêm, đổi tên hoặc xoá biến

Trong **cùng một commit**, cập nhật cả ba nơi:

1. Schema env của project: `src/config/env.ts` (service), `src/lib/env.ts` / `src/lib/env.public.ts` (app). Đây là nơi `env:check` và lúc khởi động kiểm tra.
2. `.env.example` tương ứng (không có giá trị thật).
3. Tài liệu này: bảng của project, mục "Biến liên quan giữa các service" nếu có, và "Lịch sử thay đổi".

`npm run env:check` cảnh báo khi một biến có trong `.env.example` mà chưa được nhắc trong tài liệu này, báo lỗi khi biến dạng JSON (`*_KEYS`, `*_JWK`) không đúng cú pháp (chỉ in tên biến và vị trí ký tự lỗi, không in giá trị), và báo lỗi khi `SMTP_*` không khớp nhau (mục "Gửi email thật (SMTP)").

Cột **Bắt buộc**: "Bắt buộc" nghĩa là project từ chối khởi động khi thiếu hoặc sai. "Tuỳ chọn (mặc định …)" nghĩa là có thể bỏ trống. Cột **Bí mật**: "Có" nghĩa là lộ giá trị thì phải xoay (đổi) ngay.

## Biến liên quan giữa các service

### Service token (ADR-018)

Mỗi bên gọi có **một cặp khoá Ed25519** sinh bằng `npm run keys:generate -- <tên bên gọi>`:

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

## Gửi email thật (SMTP)

Hai service gửi email: `identity-service` (mã OTP, link mời, email member) và `program-service` (email vé). Mỗi service đọc `SMTP_*` + `MAIL_FROM` của **chính nó**, nên muốn gửi thật thì điền **cả hai** `.env.local` (cùng giá trị là được).

- **Mặc định dev là Mailpit** (`SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`, không đăng nhập): không email nào ra Internet, xem ở http://localhost:8025.
- Chỉ gửi thật khi `SMTP_HOST` trỏ tới nhà cung cấp thật. Không có thông tin SMTP nào nằm trong code.
- Kiểm tra trước khi thử luồng đặt vé: `npm run mail:test -- <email nhận thử>` (cả hai service) hoặc thêm `--service program-service`. Lệnh đăng nhập SMTP, gửi một email kiểm tra và báo lỗi bằng lời (sai mật khẩu, sai cổng/TLS, cổng bị chặn, tên máy chủ sai, địa chỉ gửi bị từ chối). Lệnh không in tài khoản hay mật khẩu.
- Service **từ chối khởi động** (và `env:check` báo lỗi, chỉ in tên biến) khi: có `SMTP_USER` mà thiếu `SMTP_PASS` (hoặc ngược lại); cổng `465` mà `SMTP_SECURE=false`; `SMTP_SECURE=true` với cổng `587`/`25`.
- Khi đăng nhập tới máy chủ không phải localhost, kết nối **bắt buộc TLS** (STARTTLS ở `587`): mật khẩu không bao giờ đi qua đường truyền không mã hoá.
- `env:check` cho biết mỗi service đang dùng Mailpit hay SMTP thật (không in địa chỉ), và nhắc khi `MAIL_FROM` khác tài khoản Gmail.
- Sau khi đổi `.env.local`: tắt hẳn `npm run dev` rồi chạy lại (service chỉ đọc env lúc khởi động).

### Lựa chọn 1: Gmail SMTP + App Password (chỉ cho dev, thử tay)

1. Tài khoản Google bật **Xác minh 2 bước**.
2. https://myaccount.google.com/apppasswords → tạo App Password (tên ví dụ "LAVIECO dev") → chép 16 ký tự (bỏ dấu cách).
3. Điền vào `services/identity-service/.env.local` **và** `services/program-service/.env.local`:

| Biến | Giá trị |
|---|---|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` (587 tự nâng lên STARTTLS; hoặc `465` + `true`) |
| `SMTP_USER` | địa chỉ Gmail đó, ví dụ `ten-ban@gmail.com` |
| `SMTP_PASS` | App Password 16 ký tự (**không** phải mật khẩu Gmail) |
| `MAIL_FROM` | `"LAVIECO <ten-ban@gmail.com>"`: **phải là chính địa chỉ Gmail**, Gmail ghi đè người gửi khác |

Giới hạn: khoảng 500 email/ngày, dễ vào Spam, người nhận thấy địa chỉ Gmail cá nhân. **Không dùng cho production.** Xong việc thử thì thu hồi App Password và trả `.env.local` về Mailpit.

### Lựa chọn 2: nhà cung cấp email giao dịch với tên miền `lavieco.io.vn` (production)

Chọn nhà cung cấp là quyết định còn mở (**AQ8**); ví dụ các dịch vụ có SMTP relay như Amazon SES, Postmark, Brevo, Mailgun, Resend. Các bước chung:

1. Thêm tên miền gửi (tên miền con như `mail.lavieco.io.vn`, hoặc chính `lavieco.io.vn`) trong dashboard nhà cung cấp.
2. Thêm bản ghi DNS họ đưa: **SPF** (`TXT` có `include:` của nhà cung cấp), **DKIM** (`CNAME`/`TXT` khoá ký), và **DMARC** (`TXT _dmarc`, bắt đầu bằng `p=none` rồi siết dần). Chờ dashboard báo "verified".
3. Tạo thông tin SMTP (thường `SMTP_USER` là tên cố định như `apikey` hoặc mã truy cập, `SMTP_PASS` là API key/mật khẩu SMTP). Mỗi môi trường một khoá; lưu trong kho bí mật của máy chủ, không trong repo.
4. `SMTP_HOST`/`SMTP_PORT` theo tài liệu nhà cung cấp (thường `587` + `SMTP_SECURE=false`, hoặc `465` + `true`). `MAIL_FROM="LAVIECO <no-reply@lavieco.io.vn>"` (địa chỉ thuộc tên miền đã xác minh).
5. Chạy `npm run mail:test -- <email>` trên máy chủ; kiểm tra email tới hộp thư chính (không vào Spam) và header có `spf=pass`, `dkim=pass`.

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
| `NEXT_PUBLIC_SITE_URL` | Tuỳ chọn (mặc định `http://localhost:3000`) | Không (nhúng vào bundle) | Origin công khai, dùng cho metadata, Open Graph, canonical và làm gốc mọi URL chuyển hướng | Tự đặt | Prod: `https://lavieco.io.vn` | `http://localhost:3000` |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Tuỳ chọn (trống = dùng ảnh minh hoạ) | Không | Cloud name Cloudinary trong URL ảnh | Cloudinary Dashboard → API Keys → Cloud name | Dev và prod là **hai** product environment khác nhau | `demo-dev` |
| `IDENTITY_SERVICE_URL` | Bắt buộc | Không | identity-service trên mạng riêng | Tự đặt | Prod: địa chỉ nội bộ, không mở Internet | `http://127.0.0.1:4001` |
| `PROGRAM_SERVICE_URL` | Bắt buộc | Không | program-service trên mạng riêng | Tự đặt | Như trên | `http://127.0.0.1:4004` |
| `CONTENT_SERVICE_URL` | Bắt buộc | Không | content-service trên mạng riêng | Tự đặt | Như trên | `http://127.0.0.1:4002` |
| `SERVICE_TOKEN_PRIVATE_JWK` | Bắt buộc | **Có** | Khoá riêng Ed25519 của `web` để ký service token | `npm run keys:generate -- web` → `PRIVATE_JWK` | Mỗi môi trường một cặp khoá riêng | `'{"kty":"OKP","crv":"Ed25519","x":"GIA-x","d":"GIA-d"}'` |
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
| `ADMIN_APP_URL` | Tuỳ chọn (mặc định `http://localhost:3001`) | Không | Origin công khai của chính admin, làm gốc cho mọi URL chuyển hướng (không lấy từ host của request, vốn là `0.0.0.0:3001` sau Caddy) | Tự đặt | Prod: `https://admin.lavieco.io.vn` (đọc lúc chạy từ `admin.env`) | `http://localhost:3001` |
| `WEB_APP_URL` | Bắt buộc | Không | Origin của `web`, để nhúng trang xem trước | Tự đặt | Prod: `https://lavieco.io.vn` | `http://localhost:3000` |
| `SERVICE_TOKEN_PRIVATE_JWK` | Bắt buộc | **Có** | Khoá riêng Ed25519 của `admin` | `npm run keys:generate -- admin` → `PRIVATE_JWK` | Mỗi môi trường một cặp | `'{"kty":"OKP","crv":"Ed25519","x":"GIA-x","d":"GIA-d"}'` |
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
| `JWT_SIGNING_KEYS` | Bắt buộc | **Có** | Mảng JSON khoá riêng ký token người dùng; khoá đầu ký | `npm run keys:generate -- identity-service` → `PRIVATE_JWK`, đặt trong `[ ]` | Xoay khoá: thêm khoá mới lên đầu, giữ khoá cũ tới khi token cũ hết hạn | `'[{"kty":"OKP","crv":"Ed25519","x":"GIA","d":"GIA","kid":"k1"}]'` |
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
| `SMTP_HOST` | Bắt buộc | Không | Máy chủ SMTP gửi OTP, link mời, email member | Dev: Mailpit `127.0.0.1`; gửi thật: mục "Gửi email thật (SMTP)" | Prod: nhà cung cấp email giao dịch (AQ8) | `127.0.0.1` |
| `SMTP_PORT` | Bắt buộc | Không | Cổng SMTP | Mailpit `1025`; Gmail/nhà cung cấp `587` (hoặc `465`) | Prod thường `587` | `1025` |
| `SMTP_SECURE` | Tuỳ chọn (mặc định `false`) | Không | TLS ngay từ đầu: `true` với cổng `465`, `false` với `587`/`1025` (587 tự nâng STARTTLS; đăng nhập tới máy chủ ngoài luôn bắt buộc TLS). Sai cặp cổng/TLS thì service từ chối khởi động | Tự đặt theo cổng | | `false` |
| `SMTP_USER` | Tuỳ chọn (có thì phải có `SMTP_PASS`) | Không | Tài khoản SMTP | Gmail: địa chỉ Gmail; nhà cung cấp: dashboard | Mailpit để trống | `apikey` |
| `SMTP_PASS` | Tuỳ chọn (có thì phải có `SMTP_USER`) | **Có** | Mật khẩu/API key SMTP | Gmail: App Password 16 ký tự; nhà cung cấp: dashboard | Mailpit để trống; mỗi môi trường một khoá | `gia-smtp-pass` |
| `MAIL_FROM` | Bắt buộc | Không | Người gửi | Gmail: chính địa chỉ Gmail; nhà cung cấp: địa chỉ thuộc tên miền đã xác minh SPF/DKIM | | `"LAVIECO <no-reply@lavieco.io.vn>"` |

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
| `IDENTITY_SERVICE_URL` | Bắt buộc | Không | identity-service trên mạng riêng: ghi audit (xuất Excel, hoàn tiền) qua outbox | Tự đặt | Prod: địa chỉ nội bộ | `http://127.0.0.1:4001` |
| `CONTENT_SERVICE_URL` | Bắt buộc | Không | content-service (gắn/giải phóng ảnh) | Tự đặt | Prod: địa chỉ nội bộ | `http://127.0.0.1:4002` |
| `SERVICE_TOKEN_PRIVATE_JWK` | Bắt buộc | **Có** | Khoá riêng Ed25519 của program-service | `npm run keys:generate -- program-service` → `PRIVATE_JWK` | Mỗi môi trường một cặp | `'{"kty":"OKP","crv":"Ed25519","x":"GIA-x","d":"GIA-d"}'` |
| `WEB_APP_URL` | Bắt buộc | Không | Origin của `web`: webhook làm mới cache, link vé trong email, `returnUrl`/`cancelUrl` của payOS | Tự đặt; khi test payOS qua tunnel đặt bằng URL tunnel | Prod: `https://lavieco.io.vn` | `http://localhost:3000` |
| `REVALIDATE_SECRET` | Bắt buộc | **Có** | HMAC webhook làm mới cache, **cùng giá trị** với `web` | `RANDOM_32B` của `keys:generate` | Khác nhau giữa dev và prod | `R2lBLWdpYS1naWEtZ2lhLWdpYS1naWEtZ2lhLWdpYQ==` |
| `TICKET_LINK_SECRET` | Bắt buộc | **Có** | Khoá HMAC của link đơn/vé trong email (`/ve/[token]`, trang thanh toán, huỷ đơn) | `RANDOM_32B` của `keys:generate` | Khác nhau giữa dev và prod. **Đổi giá trị là mọi link vé đã gửi hết hiệu lực** | `VElDS0VULWdpYS1naWEtZ2lhLWdpYS1naWEtZ2lhLTE=` |
| `MAIL_PROVIDER` | Tuỳ chọn (mặc định `smtp`) | Không | Nhà cung cấp email vé (AQ8) | Tự đặt | | `smtp` |
| `SMTP_HOST` | Bắt buộc | Không | Máy chủ SMTP gửi email vé | Dev: Mailpit `127.0.0.1`; gửi thật: mục "Gửi email thật (SMTP)" | Prod: nhà cung cấp email giao dịch (AQ8) | `127.0.0.1` |
| `SMTP_PORT` | Bắt buộc | Không | Cổng SMTP | Mailpit `1025`; Gmail/nhà cung cấp `587` (hoặc `465`) | Prod thường `587` | `1025` |
| `SMTP_SECURE` | Tuỳ chọn (mặc định `false`) | Không | TLS ngay từ đầu: `true` với cổng `465`, `false` với `587`/`1025` (587 tự nâng STARTTLS; đăng nhập tới máy chủ ngoài luôn bắt buộc TLS). Sai cặp cổng/TLS thì service từ chối khởi động | Tự đặt theo cổng | | `false` |
| `SMTP_USER` | Tuỳ chọn (có thì phải có `SMTP_PASS`) | Không | Tài khoản SMTP | Gmail: địa chỉ Gmail; nhà cung cấp: dashboard | Mailpit để trống | `apikey` |
| `SMTP_PASS` | Tuỳ chọn (có thì phải có `SMTP_USER`) | **Có** | Mật khẩu/API key SMTP | Gmail: App Password 16 ký tự; nhà cung cấp: dashboard | Mailpit để trống; mỗi môi trường một khoá | `gia-smtp-pass` |
| `MAIL_FROM` | Bắt buộc | Không | Người gửi email vé | Gmail: chính địa chỉ Gmail; nhà cung cấp: địa chỉ thuộc tên miền đã xác minh SPF/DKIM | | `"LAVIECO <no-reply@lavieco.io.vn>"` |
| `PAYOS_CLIENT_ID` | Tuỳ chọn (trống = tắt payOS; đủ cả ba mới bật) | Không (nhưng đừng công bố) | Client ID của kênh thanh toán payOS | my.payos.vn → Kênh thanh toán → chọn kênh → Thông tin tích hợp | **Kênh riêng** cho dev và prod (`docs/runbooks/payos.md`) | `gia-client-id-0000` |
| `PAYOS_API_KEY` | Tuỳ chọn (như trên) | **Có** | API key gọi payOS (tạo link, đối soát, huỷ link) | Như trên | Như trên | `gia-api-key-0000` |
| `PAYOS_CHECKSUM_KEY` | Tuỳ chọn (như trên) | **Có** | Khoá HMAC xác minh chữ ký webhook; **chỉ ở program-service** | Như trên | Như trên; lộ thì đổi ngay trên my.payos.vn | `gia-checksum-key-0000` |

## Production trên máy chủ (`infra/env/prod`, ADR-022 đang đề xuất)

Production không dùng `.env.local`.

- **Biến của ứng dụng:** vẫn là các biến ở các bảng trên. Giá trị nằm trong `/opt/lavieco/env/<tên>.env` trên máy chủ, mỗi container một tệp. Mẫu (chỉ tên biến) ở `infra/env/prod/`.
- **URL giữa các service:** dùng tên service nội bộ của compose (`http://identity-service:4001`, `http://content-service:4002`, `http://program-service:4004`, `IDENTITY_JWKS_URL=http://identity-service:4001/.well-known/jwks.json`). URL lộ ra trình duyệt, email, Google, payOS (`WEB_APP_URL`, `ADMIN_APP_URL`, `GOOGLE_REDIRECT_URI`) dùng tên miền công khai.
- **Hướng dẫn đầy đủ:** `docs/runbooks/deploy-vps.md`.

Dưới đây chỉ liệt kê các biến **mới** của hạ tầng triển khai. Ứng dụng không đọc các biến này.

| Biến | Ở đâu | Bí mật | Ý nghĩa |
|---|---|---|---|
| `GHCR_OWNER`, `IMAGE_TAG` | `/opt/lavieco/compose.env` (mẫu `infra/env/prod/compose.env.example`) | Không | Image `ghcr.io/<GHCR_OWNER>/lavieco-<tên>:<IMAGE_TAG>`; `deploy.sh` ghi lại `IMAGE_TAG` sau mỗi lần deploy thành công |
| `ACME_EMAIL` | `compose.env` | Không | Email tài khoản Let's Encrypt của Caddy (thông báo chứng chỉ sắp hết hạn) |
| `NODE_OPTIONS` | Đặt sẵn trong `compose.prod.yml` (không ở tệp env) | Không | `--max-old-space-size` của từng container, thấp hơn `mem_limit` |
| `GOMEMLIMIT` | Đặt sẵn trong `compose.prod.yml` (caddy) | Không | Giới hạn mềm bộ nhớ của Caddy |
| `MONGODB_URI` (tài khoản `migrator`) | `migrate.env` | **Có** | Chỉ nạp vào container migrate, ghi đè URI của service (`docs/03` §10.3) |
| `BACKUP_MONGODB_URI` | `backup.env` | **Có** | Tài khoản `backup` chỉ đọc, dùng cho `mongo-backup.sh` |
| `BACKUP_DIR`, `BACKUP_RETENTION_DAYS` | Biến shell khi chạy `mongo-backup.sh` (tuỳ chọn) | Không | Mặc định `/opt/lavieco/backups`, 14 ngày |
| `PORT`, `HOSTNAME` | Đặt sẵn trong image `web`/`admin` (`3000`/`3001`, `0.0.0.0`) | Không | Cổng và địa chỉ lắng nghe của `server.js` (Next standalone) |
| `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | **Biến repository GitHub** (build arg của `release.yml`) | Không | Nhúng vào bundle lúc build image, không nằm trong tệp env trên máy chủ |

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
| 17/10/2026 | `program-service`: `IDENTITY_SERVICE_URL` | Thêm (audit qua outbox, ADR-021) | Phase 3, `feat/phase3-registration-payos` |
| 18/10/2026 | `identity-service`, `program-service`: `SMTP_USER`, `SMTP_PASS`, `SMTP_PORT`, `SMTP_SECURE` | Không đổi tên; thêm kiểm tra chéo (thiếu nửa thông tin đăng nhập, sai cặp cổng/TLS thì từ chối khởi động), bắt buộc TLS khi đăng nhập tới máy chủ ngoài, lệnh `npm run mail:test`, hướng dẫn Gmail/nhà cung cấp | Phase 3, `feat/phase3-registration-payos` |
| 18/10/2026 | Hạ tầng deploy: `GHCR_OWNER`, `IMAGE_TAG`, `LAVIECO_ENV_DIR`, `LAVIECO_CERT_DIR`, `COMPOSE_PROFILES`, `migrate.env`/`MONGODB_URI`, `BACKUP_MONGODB_URI`, `BACKUP_DIR`, `BACKUP_RETENTION_DAYS`, `MONGO_INITDB_ROOT_*`, `PORT`/`HOSTNAME` của image Next, secrets `DEPLOY_*` | Thêm (không đổi biến của ứng dụng) | `chore/deploy-oracle` |
| 18/10/2026 | Hạ tầng deploy chuyển sang VPS amd64: mẫu env dời về `infra/env/prod/`; thêm `ACME_EMAIL`, `NODE_OPTIONS`/`GOMEMLIMIT` trong compose; xoá `LAVIECO_ENV_DIR`, `LAVIECO_CERT_DIR`, `COMPOSE_PROFILES`, `MONGO_INITDB_ROOT_*` (bỏ profile `mongo`), secrets `DEPLOY_*` (chưa có bước SSH deploy) | Đổi hạ tầng (không đổi biến của ứng dụng) | `chore/deploy-oracle` |
| 20/10/2026 | `admin`: `ADMIN_APP_URL` | Thêm (gốc URL chuyển hướng); `web` dùng `NEXT_PUBLIC_SITE_URL` cho chuyển hướng | `fix/redirect-base-url` |
