# ADR-0027: Admin là PWA, thông báo đẩy cho staff qua identity-service

**Trạng thái:** Chấp nhận · **Ngày:** 17/11/2026

## Bối cảnh

Đội 6 người dùng admin trên điện thoại: quét check-in ở cửa, xem đơn vé, theo dõi chương trình. Cần mở như app thật (toàn màn hình, icon LAVIECO, mở nhanh) mà không lên store, không tốn phí, và được báo ngay khi có đơn vé, đăng ký mới, đơn cần xử lý hay chương trình sắp hết chỗ.

## Quyết định

- **PWA cho `apps/admin`**, phạm vi `/` (admin có tên miền riêng `admin.lavieco.io.vn`, nên không đụng trang công khai). Manifest sinh từ `src/app/manifest.ts`, icon ở `public/icons/` và `src/app/{icon,apple-icon}.png`. `proxy.ts` cho các tệp PWA đi qua khi chưa có phiên (trình duyệt tải manifest không kèm cookie).
- **Service worker viết tay** (`public/sw.js`), không dùng `@serwist/next`/`next-pwa`: chỉ cache tệp tĩnh có băm (`/_next/static`, `/icons`) và trang offline. **Không cache trang, RSC, Server Action hay API**, vì đơn và danh sách đăng ký chứa dữ liệu cá nhân. Chỉ đăng ký ở bản production. Ít mã, không phụ thuộc bundler (Next 16 build bằng Turbopack, `@serwist/next` chỉ hỗ trợ webpack).
- **Thông báo đẩy bằng Web Push chuẩn (VAPID, RFC 8030/8291/8292)** qua thư viện `web-push`, đặt ở **`identity-service`** (module `push`): identity biết staff, vai trò và đã giữ phiên của họ. Khoá riêng VAPID chỉ ở identity.
- **Chủ đề** (`PUSH_TOPICS` trong `shared`): `order_paid`, `registration_free`, `order_attention`, `event_seats`, `lead_new`. Mỗi chủ đề gắn một permission (xem được màn hình nó trỏ tới). Mỗi staff tự chọn chủ đề; chưa chọn thì nhận mọi chủ đề quyền cho phép. Khi gửi luôn cắt theo permission hiện tại.
- **Service khác phát cảnh báo qua outbox** (cùng giao dịch với dữ liệu), rồi gọi `POST /internal/v1/push-notifications` (`@AllowServices("program-service", "lead-service")`). `notificationId` suy ra cố định từ job, identity ghi vào `push_deliveries` (TTL 7 ngày), nên thử lại không báo trùng. Gửi lỗi ở một thiết bị không làm lỗi cả lượt; 404/410 thì xoá thiết bị.
- **Nội dung thông báo không chứa PII** (CLAUDE §11): tên chương trình, số vé, số tiền, mã đơn. Không bao giờ có tên, email, SĐT người đặt, vì thông báo hiện trên màn hình khoá.
- **"Sắp hết chỗ"/"hết chỗ"** báo một lần mỗi chương trình: `events.seatAlerts` được chiếm bằng cập nhật có điều kiện, trả lại nếu gửi lỗi.
- **Phiên staff trượt 72 giờ** (`STAFF_REFRESH_TTL_HOURS=72`, trước là 12): dùng app mỗi ngày thì không phải đăng nhập lại; bỏ không quá 72 giờ thì đăng nhập lại kèm 2FA. Access token vẫn 10 phút, xoay vòng và phát hiện dùng lại refresh token giữ nguyên.

## Hệ quả

- iOS chỉ nhận thông báo khi đã "Thêm vào MH chính" và từ iOS 16.4. Màn `/notifications` giải thích theo từng trường hợp.
- App cài trên iPhone có kho cookie riêng: đăng nhập một lần trong app.
- Đổi cặp khoá VAPID làm mọi thiết bị mất đăng ký: staff bật lại ở `/notifications`.
- Bản dev không có service worker (thông báo và trang offline chỉ thử được trên bản build).
- `lead_new` đã có chủ đề nhưng chưa ai phát (lead-service chưa dựng); khi dựng chỉ cần ghi outbox như `program-service`.
- Thêm phụ thuộc `web-push` cho `identity-service`.
