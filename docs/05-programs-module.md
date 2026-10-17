# 05 — Phân hệ Chương trình (Programs, Ticketing, payOS)

> Tài liệu đặc tả cho Claude Code. Đọc kèm `CLAUDE.md` và `docs/01`–`04`. Nếu tài liệu này mâu thuẫn với quy ước đã có trong repo (tên service, cách gọi giữa service, cấu trúc thư mục), **ưu tiên quy ước của repo** và ghi chú lại chỗ lệch.

> **Bản chốt 17/10/2026.** Mục "Quyết định bổ sung" ngay dưới đây **thắng** các mục cũ của tài liệu này khi nói khác nhau (mục 3, 4, 6, 8 được giữ lại để tham khảo). Chi tiết đã nhập vào `docs/01`–`04` và ADR-014 → 019.

## Quyết định bổ sung (17/10/2026)

**Thiết kế.** Ảnh trong `docs/design/admin-chuong-trinh/` chỉ để tham khảo **bố cục và luồng**:

- Style theo `packages/ui`: 6 token màu, Fraunces + Be Vietnam Pro, `react-icons/fi`. Nội dung theo docs và định vị v1.3.
- Bỏ mọi thứ trong ảnh mâu thuẫn với docs: bàn/ghế, chi nhánh, SMS/Zalo, VAT, danh sách chờ, QR đổi mã, "Thêm vào Ví", khách tự yêu cầu hoàn tiền, chữ "ven biển", số liệu tác động không nguồn, tên phụ ("The Living Gallery"...), icon Material, bảng màu trong `DESIGN.md`.
- Màn chưa có thiết kế (chi tiết chương trình, đăng nhập/đăng ký, trang lỗi/hết hạn, chọn vé desktop) tự thiết kế theo style LAVIECO.

**Kiến trúc.**

- Phân hệ thuộc **GĐ1** (ADR-014).
- `auth` → `identity-service`. `program` → **`program-service`**, miền tên `events` trong code. payOS → module `payments` của `program-service` (ADR-015).
- Webhook đi qua Route Handler của `web`.
- Service token JWT thay `INTERNAL_API_SECRET` (ADR-018). Email qua `NotifyModule` + outbox, không có gói `mailer`. Kiểm tra permission, không kiểm tra vai trò.
- Database: một cụm MongoDB Atlas (Singapore, replica set), 4 database logic `lavieco_identity` · `lavieco_content` · `lavieco_lead` · `lavieco_program`, mỗi service một user chỉ có quyền trên database của mình. Local: replica set một nút trong compose.

**Dữ liệu cá nhân.**

- Chỉ thu thông tin **người đặt** (họ tên, email, SĐT) + số lượng vé. Không thu tên từng người tham dự; mỗi vé vẫn có QR riêng.
- Chương trình cho trẻ em: người đặt là phụ huynh/người giám hộ, có ô xác nhận. Không thu thông tin của trẻ (BR-08).
- **Không** thu dị ứng, cân nặng, CCCD hay dữ liệu sức khoẻ. Thay bằng mục "Lưu ý an toàn" trên trang chi tiết (bột vỏ sò, nhựa epoxy, có phát găng tay/khẩu trang), ô "Tôi đã đọc lưu ý an toàn" ở checkout **khi chương trình có lưu ý an toàn** (lưu ý không bắt buộc, chốt 18/10/2026), và ô ghi chú tự do không bắt buộc.
- Câu trả lời form tuỳ chỉnh gắn **theo đơn**. Có ô đồng ý xử lý dữ liệu (BR-06). Turnstile chuẩn bị sẵn, bật khi có spam.

**Route.**

- `/chuong-trinh` là danh sách sự kiện, bốn nấc thang rút gọn thành một section đầu trang. Form trường học (UC-06) chuyển sang `/chuong-trinh/truong-hoc`.
- Admin dùng `/events`; `admin/programs` giữ cho `program_pages`. Một khung admin chung cho mọi mục.

**Sự kiện.**

- Vòng đời `draft → published → closed | ended`. Admin tự xem trước (trang preview đúng giao diện công khai, chỉ ai có `program:read` xem được, có link gửi cho đồng đội) rồi tự xuất bản, không cần người duyệt thứ hai. Được "Gỡ xuất bản" về `draft` khi chưa có người đăng ký.
- **Form builder** kiểu Google Form, gắn theo chương trình:
  - Loại câu hỏi: text ngắn, đoạn văn, chọn một, chọn nhiều, dropdown; có bắt buộc, mô tả phụ, kéo-thả.
  - Trường cố định luôn có: họ tên, email, SĐT, đồng ý dữ liệu. Ô "đã đọc lưu ý an toàn" chỉ hiện khi chương trình có lưu ý an toàn.
  - Đã có người đăng ký thì chỉ được thêm hoặc ẩn câu hỏi, không xoá hay đổi kiểu. Câu trả lời cũ vẫn xuất ra Excel.
- **Loại chương trình** do admin quản lý trong Cài đặt (seed: Workshop, Talkshow, Triển lãm). Hình thức **online/offline** là trường riêng.
- Có nút **Nhân bản chương trình** (tạo nháp mới, copy thông tin, loại vé và form).
- `isFree` tính ra từ giá vé: **miễn phí = có loại vé đang hiện giá 0**. Triển lãm không giới hạn chỗ: `quantity = null`. Không làm danh sách chờ.
- Trang công khai: không hiện số chỗ khi `quantity = null`; "Còn X chỗ" chỉ khi còn ≤ 10; "Hết chỗ" khi 0.
- **Sự kiện đã diễn ra** (`kind: past`, chốt 18/10/2026): ghi lại chương trình diễn ra trước khi có hệ thống. Không loại vé, không form, bỏ điều kiện bắt đầu ở tương lai (nhưng phải đã kết thúc), xuất bản thẳng vào `ended`, chỉ hiện ở mục "Chương trình đã diễn ra".
- Thiếu link trực tuyến chỉ là **cảnh báo** khi xuất bản; Phase 3 không phát hành vé/email cho sự kiện trực tuyến khi link còn trống.
- Chương trình online: link nằm trong email vé và trên trang vé, gửi nhắc lại 24 giờ trước.

**Phase 3 (17/10/2026, gộp Phase 3 + 5 + phần ngày diễn ra của Phase 4).**

- OTP ở `identity-service` trả **bằng chứng có chữ ký** (`aud=lavieco:email-verification`); `program-service` kiểm bằng JWKS, so email trong bằng chứng với email người đặt, purpose `checkout`, còn hạn, và chỉ dùng **một lần** (`orders.verificationId` unique; gửi lại cùng bằng chứng trả về đơn đã tạo). Member có email đã xác thực lấy bằng chứng cùng định dạng (ADR-021) nên bỏ qua OTP.
- Không có sức chứa tổng của chương trình: sức chứa = tổng `quantity` các loại vé; giữ chỗ kiểm tra theo từng loại trong một giao dịch.
- Link thanh toán payOS: `description = "LAVIECO"` (giới hạn 9 ký tự với tài khoản không liên kết qua payOS), `expiredAt` (giây, làm tròn xuống) không muộn hơn hạn giữ chỗ.
- Webhook, trang quay về và nút "Kiểm tra lại thanh toán" dùng **chung một hàm** ghi nhận thanh toán, idempotent theo đơn, có kiểm số tiền (`amountMismatch`). Tiền tới sau khi đơn hết hạn hoặc khách đã huỷ: còn chỗ thì giữ lại chỗ (`latePayment`), hết chỗ thì `paid` + `refundRequired` (admin thấy cảnh báo).
- Khách huỷ đơn bằng link có chữ ký; huỷ link payOS qua outbox; link đã được trả trong lúc đó thì ghi nhận như trên.
- `forChildren` (sự kiện cho trẻ em): ô "Tôi là phụ huynh/người giám hộ" bắt buộc, lưu `buyer.isGuardian`.
- Danh sách người đăng ký (có PII) cần `order:read`; xuất Excel cần `registration:export` + step-up + audit, ô bắt đầu bằng `= + - @` được vô hiệu hoá.
- Check-in: cập nhật nguyên tử `valid → used`; quét lại trả "đã check-in lúc …"; camera dùng `BarcodeDetector`, dự phòng `jsqr`.
- Runbook thanh toán thật qua tunnel: `docs/runbooks/payos.md`.

**Khác.**

- Tên miền chính thức `lavieco.io.vn` (chốt AQ5).
- Mã vé ngắn, ngẫu nhiên, không tuần tự (ví dụ `LVC-7K3Q9M`).
- Model theo quy ước `docs/03`. `PaymentEvent` chỉ lưu trường cần đối soát, không lưu nguyên payload có tên người chuyển. Thời hạn lưu đơn/vé: đề xuất ở DQ8 (`docs/03`).
- Lưu vé vào tài khoản từ trang thành công cần token gắn phiên checkout, hết hạn ngắn.
- Google login chỉ cho member; admin giữ 2FA.
- Check-in: permission `checkin:perform`, gán cho Coordinator (và Super Admin).
- Xuất Excel người đăng ký: step-up + audit.

## 0. Trước khi code

1. Đọc `CLAUDE.md`, `docs/01`–`04`.
2. Xem **toàn bộ** ảnh thiết kế trong `docs/design/admin-chuong-trinh/` (dùng Read để xem ảnh). Lập danh sách màn → route tương ứng → component chính. UI phải bám sát các màn này.
3. Kiểm tra 3 service hiện có trong repo, đề xuất ánh xạ vào mục 3 (gộp/tách nếu cần) và **dừng lại cho tôi duyệt** trước khi viết code.
4. Mỗi phase (mục 9) làm xong thì dừng, tóm tắt, chờ duyệt.

Quy ước chung: npm (không pnpm), Next.js 16 (`proxy.ts` thay cho `middleware.ts`, `.env.local`), code trong `src/`, MongoDB, TypeScript strict. Tất cả text UI bằng tiếng Việt. Tiền tệ là VND, lưu dạng số nguyên.

## 1. Mục tiêu

Tab "Chương trình" trên lavieco.io.vn đăng các workshop, triển lãm, talkshow của LAVIECO. Người dùng xem, đăng ký, mua vé (thanh toán payOS/VietQR) và nhận vé QR qua email. Admin tạo chương trình, quản lý người đăng ký, xuất Excel, đối soát đơn, check-in bằng quét QR tại cửa.

## 2. Quyết định đã chốt

- **Khách không đăng nhập vẫn mua được vé.** Bắt buộc nhập họ tên, email, SĐT.
- **Email phải được xác nhận bằng OTP trước khi tạo đơn/thanh toán.** User đã đăng nhập có email đã xác thực thì bỏ qua OTP, trừ khi đổi sang email nhận vé khác.
- **Mọi người mua (khách hay user) đều nhận vé qua email.** User đăng nhập thấy thêm vé trong "Vé của tôi".
- **Chương trình miễn phí cũng phải OTP** (chống đăng ký ảo), không qua payOS.
- **Giữ chỗ chỉ bắt đầu sau khi OTP thành công**, kéo dài 15 phút.
- **CTA khuyến khích tạo tài khoản**: đầu form checkout, trang thành công ("Lưu vé vào tài khoản — chỉ cần đặt mật khẩu"), trong email vé.
- **Khi đăng ký tài khoản bằng email đã có đơn**, tự động gắn các đơn/vé cũ vào tài khoản. Chỉ làm khi email của tài khoản đã xác thực.
- **Workshop không có số ghế/bàn.** Không làm sơ đồ chỗ ngồi.
- **Hoàn tiền làm thủ công** (admin chuyển khoản lại), hệ thống chỉ cập nhật trạng thái.
- **SĐT chỉ kiểm tra định dạng**, không OTP SMS. Không gửi SMS.
- **LAVIECO chỉ hoạt động ở Cần Thơ.** Không có khái niệm chi nhánh.

## 3. Kiến trúc service (đề xuất, cần đối chiếu repo)

| Service | Sở hữu dữ liệu | Trách nhiệm |
|---|---|---|
| **auth** | users, sessions, otp_codes | Đăng ký/đăng nhập (email+mật khẩu, Google), OTP email (dùng chung cho đăng ký và checkout), quên mật khẩu, phân quyền, gắn đơn cũ khi tạo tài khoản |
| **program** (programs + ticketing) | programs, ticket_types, orders, tickets, registration_answers | CRUD chương trình, giữ chỗ nguyên tử, tạo đơn, phát hành vé, check-in, tra cứu vé, xuất Excel |
| **payment** | payment_events | Gọi payOS tạo link, nhận webhook, xác minh chữ ký, báo cho program service; đối soát thủ công |

- `apps/web`: trang public, checkout, tài khoản, tra cứu vé.
- `apps/admin`: dashboard, quản lý chương trình, người đăng ký, đơn hàng, check-in.
- `packages/`: types dùng chung (DTO, enum trạng thái), zod schemas, email templates nếu phù hợp.
- Gọi nội bộ giữa service: HTTP với header secret dùng chung (`INTERNAL_API_SECRET`), hoặc theo cơ chế repo đang dùng. Mọi endpoint `/internal/*` phải từ chối request thiếu secret.
- Gửi email: tạo một module/package `mailer` dùng chung. Provider đọc từ env (mặc định SMTP qua Nodemailer; giữ interface để đổi sang Resend sau).

## 4. Mô hình dữ liệu (MongoDB)

```ts
// auth
User { _id, name, email (unique, lowercase), phone?, passwordHash?, googleId?,
       emailVerifiedAt?, role: 'user'|'staff'|'admin', createdAt }
OtpCode { _id, email, purpose: 'signup'|'checkout'|'ticket_lookup'|'reset_password',
          codeHash, expiresAt (TTL index), attempts, createdAt, ip }

// program
Program { _id, slug (unique), title, type: 'workshop'|'exhibition'|'talkshow'|'online',
          coverUrl, gallery[], summary, description (rich text),
          startAt, endAt, location: { address?, mapUrl?, onlineUrl? },
          speakers[{ name, role, avatarUrl }], agenda[{ time, title }],
          includes[], faq[{ q, a }], refundPolicy,
          formFields: FormField[], status: 'draft'|'published'|'closed'|'ended',
          isFree, createdBy, createdAt, updatedAt }
FormField { id, label, type: 'text'|'textarea'|'select'|'radio'|'checkbox',
            options?: string[], required: boolean, order }
TicketType { _id, programId, name, price (int VND), quantity, sold, held,
             saleStartAt?, saleEndAt?, maxPerOrder }
Order { _id, orderCode (int, unique — payOS yêu cầu số), programId,
        userId? (null nếu khách), buyer: { name, email, phone }, emailVerifiedAt,
        items[{ ticketTypeId, name, unitPrice, qty }], amount,
        status: 'pending'|'paid'|'cancelled'|'expired'|'refunded',
        expiresAt, paidAt?, payos: { paymentLinkId?, checkoutUrl?, qrCode?, reference? },
        refundedAt?, refundNote?, createdAt }
Ticket { _id, code ('LVC-26-0001', unique), orderId, programId, ticketTypeId,
         attendee: { name, phone? }, qrToken (unique, ngẫu nhiên ≥32 byte, base64url),
         status: 'valid'|'used'|'void', checkedInAt?, checkedInBy? }
RegistrationAnswer { _id, ticketId, programId, answers: { [fieldId]: string|string[] } }

// payment
PaymentEvent { _id, orderCode, type: 'webhook'|'reconcile', payload, verified: boolean,
               processedAt?, createdAt }
```

Index cần có: `Order.orderCode`, `Order.buyer.email`, `Order.status + expiresAt`, `Ticket.qrToken`, `Ticket.code`, `Ticket.programId`, `OtpCode.expiresAt` (TTL).

## 5. Luồng nghiệp vụ

### 5.1 Checkout có phí
1. `POST /checkout/start` nhận programId, items, buyer, attendees, answers. Validate (zod), kiểm tra chương trình đang mở bán và số lượng mỗi đơn. Chưa giữ chỗ.
   - Nếu user đăng nhập có email đã xác thực và trùng email nhận vé: sang bước 3.
   - Nếu không: auth service gửi OTP (`purpose: 'checkout'`), trả `checkoutSessionId`.
2. `POST /checkout/verify-otp` nhận checkoutSessionId và code.
3. **Giữ chỗ nguyên tử** cho từng loại vé:
   `findOneAndUpdate({ _id, $expr: { $lte: [{ $add: ['$sold', '$held', qty] }, '$quantity'] } }, { $inc: { held: qty } })`.
   Nếu một loại thất bại, hoàn `held` các loại đã giữ (hoặc dùng transaction nếu Mongo chạy replica set). Tạo Order `pending`, `expiresAt = now + 15'`.
4. Program service gọi payment service tạo payment link payOS (orderCode, amount, description, items, returnUrl, cancelUrl, expiredAt). Lưu `qrCode`, `checkoutUrl`. UI hiển thị QR ngay trên trang LAVIECO (đúng màn thiết kế), có nút mở checkoutUrl dự phòng.
5. Trang thanh toán poll `GET /orders/:orderCode/status` mỗi 3s (hoặc SSE).
6. **Webhook payOS** → payment service:
   - Xác minh chữ ký bằng checksum key qua SDK chính thức. Sai thì trả 400, log lại.
   - Lưu PaymentEvent. Kiểm tra `amount` khớp đơn.
   - Gọi `POST /internal/orders/:orderCode/mark-paid`. Endpoint này **idempotent**: chỉ chuyển `pending → paid` một lần; `held → sold`; sinh Ticket + RegistrationAnswer; gửi email vé.
   - Nếu webhook tới khi đơn đã `expired` nhưng tiền đã vào: vẫn ghi nhận `paid` nếu còn chỗ; nếu hết chỗ thì đánh dấu cần hoàn tiền và hiện cảnh báo trên admin.
7. `returnUrl` **chỉ dùng để hiển thị**, không bao giờ dùng để xác nhận thanh toán. Khi người dùng quay về mà đơn vẫn `pending`, gọi API lấy thông tin payment của payOS để đối soát.
8. Job mỗi phút: đơn `pending` quá `expiresAt` → `expired`, trả lại `held`, huỷ payment link.
9. Người dùng bấm "Huỷ đơn": `cancelled`, trả `held`, huỷ link.

### 5.2 Checkout miễn phí
Giống 5.1 bước 1–3, sau đó tạo Order `paid` với `amount = 0`, chuyển thẳng `held → sold`, phát hành vé, gửi email. Không gọi payOS.

### 5.3 Email vé
Gửi khi đơn chuyển `paid`. Nội dung: tên chương trình, ngày giờ, địa điểm, từng vé (tên người tham dự, loại vé, mã vé, ảnh QR inline/CID), nút "Xem vé" (link `/ve/[token]`, token ký HMAC chứa orderId, hạn dài), CTA tạo tài khoản nếu là khách. Có thể đính kèm file `.ics`.

### 5.4 Khách xem lại vé
- `/ve/[token]`: xác minh chữ ký và hiển thị vé của đơn đó.
- `/tra-cuu-ve`: nhập email → OTP (`purpose: 'ticket_lookup'`) → liệt kê mọi vé của email đó → CTA tạo tài khoản.

### 5.5 Tạo tài khoản sau khi mua
- Ở trang thành công: email đã xác thực trong checkout nên chỉ cần đặt mật khẩu (hoặc Google cùng email). Tạo user với `emailVerifiedAt` lấy từ đơn.
- Khi user xác thực email (bất kỳ cách nào): gắn `userId` cho mọi Order cùng `buyer.email` mà chưa có userId.

### 5.6 Check-in
- Màn quét QR trong `apps/admin`, role `staff` hoặc `admin`, ưu tiên mobile.
- `POST /checkin` nhận qrToken (hoặc mã vé nhập tay) và programId. Cập nhật nguyên tử `{ qrToken, programId, status: 'valid' } → 'used'`. Trả về một trong ba kết quả:
  - hợp lệ (kèm tên, loại vé)
  - đã sử dụng (kèm thời điểm)
  - không hợp lệ / sai chương trình
- Hiển thị bộ đếm đã check-in / tổng.

### 5.7 Hoàn tiền / huỷ vé (admin)
Admin chuyển khoản thủ công, sau đó bấm "Hoàn tiền": Order `refunded`, Ticket `void`, trả lại `sold`, ghi `refundNote`. "Huỷ vé" lẻ: Ticket `void`, trả 1 chỗ.

### 5.8 Danh sách người đăng ký & xuất Excel
- Bảng theo từng chương trình: STT, họ tên, email, SĐT, loại vé, mã vé, mã đơn, trạng thái thanh toán, check-in, thời gian đăng ký, cùng **một cột cho mỗi FormField**. Có tìm kiếm, lọc, phân trang server-side.
- `GET /admin/programs/:id/registrations/export?columns=...&includeCancelled=...` dùng `exceljs`, stream file `LAVIECO_<slug>_<yyyy-mm-dd>.xlsx`. Header in đậm, freeze dòng đầu, auto width.
- Thao tác hàng loạt: gửi lại vé, check-in thủ công, huỷ vé.

## 6. Danh sách API (gợi ý)

**auth**: `POST /auth/register`, `/auth/login`, `/auth/google`, `/auth/logout`, `/auth/otp/send`, `/auth/otp/verify`, `/auth/password/forgot`, `/auth/password/reset`, `GET /auth/me`.

**program (public)**: `GET /programs` (lọc type, free, thời gian, q), `GET /programs/:slug`, `POST /checkout/start`, `POST /checkout/verify-otp`, `POST /checkout/resend-otp`, `GET /orders/:orderCode/status`, `POST /orders/:orderCode/cancel`, `GET /me/tickets`, `GET /me/orders`, `GET /tickets/by-token/:token`, `POST /ticket-lookup/start`, `POST /ticket-lookup/verify`.

**program (admin)**: CRUD `/admin/programs`, `/admin/programs/:id/ticket-types`, `GET /admin/programs/:id/registrations`, `.../export`, `GET /admin/orders`, `POST /admin/orders/:id/reconcile`, `/refund`, `/resend-tickets`, `POST /checkin`, `GET /admin/dashboard`.

**program (internal)**: `POST /internal/orders/:orderCode/mark-paid`.

**payment**: `POST /payments/links` (internal), `POST /payments/payos/webhook` (public), `GET /payments/:orderCode` (internal, đối soát), `POST /payments/:orderCode/cancel` (internal).

## 7. Bảo mật & chống lạm dụng

- **OTP**: 6 số, hash khi lưu, hết hạn 5 phút, tối đa 5 lần nhập sai. Gửi tối đa 3 lần/10 phút cho mỗi email và giới hạn theo IP. Thêm Cloudflare Turnstile nếu bị spam.
- **Webhook**: luôn xác minh chữ ký; xử lý idempotent theo orderCode.
- **qrToken**: ngẫu nhiên, không đoán được, không chứa thông tin cá nhân.
- **Giá tiền**: luôn tính lại ở server, không tin giá từ client.
- **Phân quyền**: route admin chỉ cho `admin`; check-in cho `staff` và `admin`; kiểm tra ở cả service, không chỉ ở UI.
- **Bí mật**: không commit secret. Cập nhật `.env.example`.

## 8. Biến môi trường

```
PAYOS_CLIENT_ID=
PAYOS_API_KEY=
PAYOS_CHECKSUM_KEY=
PAYOS_RETURN_URL=https://lavieco.io.vn/chuong-trinh/thanh-toan/ket-qua
PAYOS_CANCEL_URL=https://lavieco.io.vn/chuong-trinh/thanh-toan/ket-qua?cancel=1
INTERNAL_API_SECRET=
TICKET_LINK_SECRET=
MAIL_PROVIDER=smtp
SMTP_HOST= SMTP_PORT= SMTP_USER= SMTP_PASS= MAIL_FROM="LAVIECO <...>"
GOOGLE_CLIENT_ID= GOOGLE_CLIENT_SECRET=
```

Kiểm tra tài liệu SDK payOS **phiên bản hiện tại** (`@payos/node`) trước khi viết code: tên hàm, giới hạn độ dài `description`, cách xác minh webhook, cách đăng ký webhook URL. Không viết theo trí nhớ.

## 9. Lộ trình (mỗi phase dừng lại chờ duyệt)

| Phase | Nội dung | Xong khi |
|---|---|---|
| 1 | Auth: đăng ký, đăng nhập, Google, OTP dùng chung, quên mật khẩu, role, `proxy.ts` bảo vệ route | Đăng ký → OTP → đăng nhập chạy được; route admin chặn user thường |
| 2 | Program CRUD (admin, gồm form builder và loại vé) + trang danh sách/chi tiết public | Tạo chương trình ở admin, thấy được trên web |
| 3 | Checkout miễn phí + OTP khách + phát hành vé QR + email + `/ve/[token]` + tra cứu vé | Khách đăng ký workshop miễn phí, nhận email có QR |
| 4 | Check-in + danh sách người đăng ký + xuất Excel | Quét QR đổi trạng thái; tải được file .xlsx đúng cột form |
| 5 | payOS: tạo link, màn QR, webhook, poll trạng thái, job hết hạn, đối soát | Thanh toán thật ở môi trường test, vé tự phát hành |
| 6 | Vé của tôi, lịch sử đơn, gắn đơn cũ khi tạo tài khoản, hoàn tiền/huỷ vé, dashboard | Toàn bộ màn thiết kế hoạt động |

## 10. Kiểm thử bắt buộc

- Hai request mua vé cuối cùng đồng thời: chỉ một thành công (không bán vượt).
- Webhook gửi trùng 2 lần: chỉ phát hành vé một lần.
- Webhook sai chữ ký bị từ chối.
- Đơn hết hạn trả chỗ đúng.
- Quét cùng một QR 2 lần: lần 2 báo "đã sử dụng".
- Khách mua → tạo tài khoản cùng email → vé xuất hiện trong "Vé của tôi".
- OTP sai quá 5 lần bị khoá; gửi quá giới hạn bị chặn.
