# Chạy LAVIECO trên máy dev (local)

Tài liệu ngắn để dựng và chạy toàn bộ monorepo trên máy. **Chỉ dành cho dev local**: không có gì ở đây áp dụng cho production. Ý nghĩa từng biến môi trường nằm ở `docs/06-bien-moi-truong.md`.

## 1. Cần cài

| Công cụ | Ghi chú |
|---|---|
| Node.js 24 + npm | Dùng `node --watch` và `--env-file` của Node |
| Docker Desktop | Chạy MongoDB (replica set) và Mailpit. Phải đang mở trước khi chạy `npm run dev:up` |
| Git | Trên Windows có Git Bash là đủ |
| Ứng dụng authenticator (tuỳ chọn) | Google Authenticator, 1Password…; hoặc dùng `npm run dev:totp` |

## 2. Lần đầu

```bash
npm install
npm run env:init          # tạo mọi .env.local từ .env.example (không ghi đè file đã có)
npm run env:check         # phải toàn ✓, mail báo "Mailpit (local)"
```

Điền các khoá còn trống theo `docs/06` (khoá ký JWT, service token: `npm run keys:generate -- <bên gọi>`; khoá Cloudinary dev nếu cần thử tải ảnh). Mặc định đã trỏ Mongo local và Mailpit, không cần sửa gì thêm cho hai phần này.

```bash
npm run dev:up            # Docker (Mongo + Mailpit) → dọn cổng → npm run dev
npm run dev:seed          # (cửa sổ terminal khác) tạo tài khoản dev (mục 5) + chương trình mẫu (mục 5.1)
```

## 3. Hằng ngày

| Lệnh | Việc |
|---|---|
| `npm run dev:up` | Bật Mongo + Mailpit (chờ healthy), dừng process **`node`** cũ đang chiếm cổng dev (không bao giờ đụng chương trình khác), rồi chạy `npm run dev`. Ctrl+C để dừng |
| `npm run dev:up -- --no-dev` | Chỉ bật Docker và dọn cổng |
| `npm run dev` | Chỉ chạy app + service (Docker phải đang chạy) |
| `npm run dev:infra:down` | Tắt Mongo + Mailpit (dữ liệu vẫn còn trong volume `mongo-data`) |
| `npm run dev:seed` | Tạo/đặt lại tài khoản dev và chương trình mẫu, chạy lại bao nhiêu lần cũng không nhân bản |
| `npm run dev:totp` | In mã 2FA hiện tại của staff dev (`-- --email <email>`, `-- --uri` để thêm vào app authenticator) |
| `npm run env:check` | Kiểm tra `.env.local` (chỉ in tên biến, không in giá trị) |
| `npm run mail:test -- <email>` | Gửi thử 1 email qua identity + program (dev: vào Mailpit) |

Service khởi động trước khi Mongo sẵn sàng sẽ **đợi và thử lại** mỗi 3 giây (chỉ khi `NODE_ENV=development`), không còn chết sau khoảng 10 lần thử.

## 4. Cổng

| Thành phần | Địa chỉ |
|---|---|
| `web` | http://localhost:3000 |
| `admin` | http://localhost:3001 |
| `identity-service` | http://127.0.0.1:4001 |
| `content-service` | http://127.0.0.1:4002 |
| `lead-service` | 4003 (chưa dựng, cổng được giữ chỗ) |
| `program-service` | http://127.0.0.1:4004 |
| MongoDB (replica set `rs0`) | `127.0.0.1:27018` (`MONGO_PORT` ở `.env.local` gốc) |
| Mailpit SMTP | `127.0.0.1:1025` |
| Mailpit (xem email) | http://localhost:8025 |
| `mail:preview` | http://localhost:3999 |

Service chỉ nghe trên máy; trình duyệt luôn đi qua `web`/`admin`.

## 5. Tài khoản dev (`npm run dev:seed`)

Chỉ tồn tại trong Mongo **local**. Lệnh từ chối chạy khi `NODE_ENV` khác `development` hoặc `MONGODB_URI` không phải `localhost`/`127.0.0.1`/`::1` (Atlas, `mongodb+srv://` và mọi host khác bị chặn). Đây là ngoại lệ duy nhất của quy tắc "không tài khoản mặc định trong seed" (CLAUDE §11). Mật khẩu dưới đây là **công khai, chỉ cho dev**: đừng dùng lại ở bất cứ đâu. Nguồn: `services/identity-service/src/cli/dev-accounts.ts`.

| Vai trò | Email | Mật khẩu | Đăng nhập ở |
|---|---|---|---|
| Staff, `super_admin` (mọi quyền) | `superadmin@lavieco.test` | `LvDev!Super26` | admin :3001 |
| Staff, `coordinator` (chương trình, đơn, check-in) | `coordinator@lavieco.test` | `LvDev!Coord26` | admin :3001 |
| Thành viên | `an@lavieco.test` | `LvDev!Member26` | web :3000 |
| Thành viên | `binh@lavieco.test` | `LvDev!Member26` | web :3000 |

Chạy lại `dev:seed` sẽ đặt lại mật khẩu và gỡ khoá đăng nhập (sau 5 lần sai) của các tài khoản này.

**Đăng nhập admin (2 bước, bắt buộc 2FA):**

1. http://localhost:3001/login, nhập email + mật khẩu staff.
2. Màn hình "Xác thực 2 lớp": mã 6 số là **TOTP** (ứng dụng authenticator), **không** gửi qua email/Mailpit. Lấy mã bằng:
   ```bash
   npm run dev:totp -- --email superadmin@lavieco.test
   ```
   Mã đổi mỗi 30 giây, mỗi mã chỉ dùng được một lần. Muốn dùng app authenticator: `npm run dev:totp -- --uri` rồi tạo QR từ chuỗi `otpauth://` (hoặc nhập tay secret trong chuỗi đó).

**Đăng ký thành viên mới trên web (OTP qua Mailpit):** http://localhost:3000/dang-ky → điền tên, email bất kỳ (nên dùng `*@lavieco.test`), mật khẩu, tick đồng ý → "Gửi mã xác thực" → mở http://localhost:8025, email "Mã xác thực LAVIECO: …" chứa mã 6 số (hết hạn sau 5 phút). Quên mật khẩu cũng nhận mã ở đây.

### 5.1. Chương trình mẫu (phần program của `dev:seed`)

`npm run dev:seed` chạy thêm `dev:seed` của `program-service` (riêng: `npm run dev:seed -w @lavieco/program-service`). Cùng hàng rào: chỉ `NODE_ENV=development` + Mongo trên máy. Lệnh chạy migration của `lavieco_program` trước (index + 3 loại chương trình), rồi tạo 11 chương trình, mỗi cái một trạng thái cần xem trên web/admin. Nguồn: `services/program-service/src/cli/dev-events.ts`.

| Slug | Trạng thái để xem |
|---|---|
| `workshop-tranh-kham-vo-so` | Đang mở, 2 loại vé (vé sớm hết hạn bán sau 7 ngày), form 3 câu hỏi, lưu ý an toàn; đơn đủ trạng thái: đã thanh toán, đang giữ chỗ, hết hạn, đã huỷ, đã hoàn tiền |
| `talkshow-giao-duc-xanh-truc-tuyen` | Trực tuyến, miễn phí, có link |
| `workshop-gia-dinh-chuong-gio-vo-oc` | Dành cho trẻ em (tick phụ huynh/người giám hộ), "Còn 2 chỗ" |
| `workshop-tui-vai-tu-luoi-danh-ca` | Hết chỗ |
| `trien-lam-song-thu-hai-cua-vo-so` | Chưa mở bán (vé mở sau 7 ngày), không giới hạn số lượng |
| `webinar-ve-sinh-vo-hai-san` | Trực tuyến chưa có link (không nhận đăng ký) |
| `workshop-in-tranh-tu-la-cay` | Đã đóng đăng ký, còn vé đã bán |
| `workshop-ban-nhap-den-ngu-vo-so` | Bản nháp (chỉ thấy ở admin) |
| `workshop-mo-dau-tranh-vo-nghieu` | Đã kết thúc, có vé đã check-in, vé chưa dùng và vé huỷ |
| `trien-lam-thi-diem-can-tho-2025`, `lop-hoc-sang-tao-xanh-thi-diem` | Sự kiện đã qua (lưu trữ, không vé) |

- Ngày giờ tính **tương đối với lúc chạy** (giờ Việt Nam), nên chạy lại sẽ "làm mới" lịch. Chạy lại chỉ dựng lại những gì lệnh này tạo (`createdBy = cli:dev-seed`): đơn, vé, câu trả lời của chúng bị xoá và tạo lại. Chương trình tạo ở admin **không bao giờ** bị đụng (trùng slug thì bỏ qua).
- Người đặt là người giả `*@lavieco.test` (gồm `an@`, `binh@` của mục 5), đơn khách (`userId = null`). Tra vé ở `/tra-cuu-ve` bằng các email này, mã OTP ở Mailpit.
- Đơn "đang giữ chỗ" hết hạn sau 15 phút như đơn thật (job hết hạn trả chỗ). Không có link thanh toán payOS.
- Không có ảnh bìa: ảnh đi qua `content-service`/Cloudinary (ADR-020), thêm ở admin nếu cần.

## 6. Chuyển sang MongoDB Atlas (dev)

Mặc định dev dùng Mongo local để không phụ thuộc IP allowlist của Atlas. Muốn dùng Atlas dev, trong `.env.local` của **từng** service (`identity`, `content`, `program`):

1. Comment dòng `MONGODB_URI`/`MONGODB_DB` local, bỏ comment dòng `# Atlas dev: …` (máy đã được chuyển sẽ có sẵn dòng này; máy mới thì xem mẫu trong `.env.example`).
2. `MONGODB_DB` **phải** kết thúc bằng `_dev` (service từ chối khởi động nếu không, docs/04 §11.1). Không bao giờ trỏ vào database production.
3. Thêm IP hiện tại của máy vào Atlas → Network Access.
4. `npm run env:check`, rồi chạy lại `npm run dev`.

`dev:seed` **không chạy trên Atlas** (cố ý). Quay lại local: làm ngược bước 1.

## 7. Lỗi thường gặp

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| `env:check` báo identity/program thiếu `MAIL_FROM_FALLBACK, MAIL_REPLY_TO, BREVO_SMTP_USER, BREVO_SMTP_KEY` và "real SMTP" | `.env.local` cũ, trước ADR-0023, đang trỏ SMTP thật | `npm run env:check -- --fix` để thêm biến còn thiếu; đặt `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`, `SMTP_SECURE=false`, để trống `SMTP_USER`, `SMTP_PASS`, `BREVO_SMTP_USER`, `BREVO_SMTP_KEY`. Chạy lại cho tới khi báo `mail: Mailpit (local)` |
| Đăng ký web báo "Hệ thống đang bận"; log identity: Brevo `EAUTH 535`, rồi Gmail `ESOCKET`, `common.unavailable: email could not be sent` (`OtpService.create`) | Đang gửi mail thật bằng khoá Brevo/Gmail sai hoặc hết hạn | Chuyển mail dev sang Mailpit như dòng trên; xem email ở http://localhost:8025 |
| Log `mail delivery failed … ESOCKET` dù đã trỏ Mailpit | `SMTP_HOST=localhost`: Node phân giải ra `::1` (IPv6), Mailpit chỉ nghe `127.0.0.1` | Dùng `SMTP_HOST=127.0.0.1` (`env:check` báo lỗi nếu còn `localhost`). Service tự khởi động lại khi `.env.local` đổi |
| Service không kết nối được Mongo Atlas (`MongooseServerSelectionError`) | IP máy chưa có trong allowlist Atlas | Dùng Mongo local (mặc định, mục 6) hoặc thêm IP vào Atlas → Network Access |
| `program-service` chết sau khi hết lần thử, `Failed running 'src/main.ts'. Waiting for file changes…`; web báo `ECONNREFUSED 127.0.0.1:4004` | Trước đây service bỏ cuộc sau ~10 lần thử kết nối, và `node --watch` không tự chạy lại khi process chết | Đã sửa: ở dev service đợi DB tới khi có. Nếu vẫn gặp (ví dụ Mongo bị tắt **giữa chừng**, mục 8): `npm run dev:up` lại, hoặc lưu lại một file bất kỳ của service đó |
| `admin` chết vì cổng 3001 bận; `web` nhảy sang 3002 | Process `next` cũ còn sống: trên Windows, dừng `npm run dev` không dừng tiến trình con `start-server.js` của Next | `npm run dev:up` tự dừng các process **node** cũ trên 3000/3001/4001–4004. Nếu cổng bị chương trình khác giữ, lệnh chỉ báo tên + PID và dừng lại |
| Đăng nhập admin xong bị đưa tới `/dang-nhap` (404) | `next=` trỏ tới đường dẫn không có trong admin (ví dụ route của web) | Đã sửa: `next` chỉ nhận đường dẫn của mục admin có thật (`/`, `/events`, `/orders`, `/checkin`), sai thì về `/`; URL tuyệt đối, `//…`, `\` bị chặn |
| `dev:seed refused: …` | Đang trỏ Atlas/host khác, hoặc `NODE_ENV` không phải `development` | Chuyển về Mongo local (mục 6). Cố ý: seed không bao giờ ghi lên DB dùng chung |
| `dev:seed: MongoDB is not reachable` | Docker/Mongo chưa chạy | `npm run dev:infra` (hoặc `dev:up`), rồi chạy lại |
| Mã 2FA admin bị từ chối | Mã đã hết hạn (30 giây) hoặc đã dùng rồi | Chạy lại `npm run dev:totp` và nhập mã mới; kiểm tra đồng hồ máy đúng giờ |
| Trình duyệt tự điền tài khoản khác vào form đăng nhập admin | Chrome lưu mật khẩu cũ cho `localhost:3001` | Xoá trắng ô rồi nhập lại tài khoản dev |

## 8. Giới hạn còn biết

- Tắt Mongo **khi service đang chạy** vẫn làm service chết: worker outbox (`@lavieco/service-kit`, `OutboxWorker`) không bắt lỗi DB trong vòng lặp. Sửa cần đổi code dùng chung cả production nên chưa làm; tạm thời chạy lại `npm run dev:up`.
