# LAVIECO Admin trên điện thoại (PWA)

Trang quản trị `https://admin.lavieco.io.vn` cài được lên màn hình chính như một app: mở toàn màn hình, có icon LAVIECO, mở nhanh, nhận thông báo. Không qua App Store/CH Play, không mất phí. Quyết định kỹ thuật: ADR-0027.

## 1. Cài app

### iPhone / iPad (Safari)

1. Mở **Safari** (bắt buộc Safari; Chrome trên iPhone cũng cài được nhưng qua menu riêng của nó) và vào `https://admin.lavieco.io.vn`.
2. Bấm nút **Chia sẻ** (ô vuông có mũi tên lên) ở thanh dưới.
3. Kéo xuống, chọn **Thêm vào MH chính** → **Thêm**.
4. Mở **LAVIECO** từ màn hình chính. iOS mới chép phiên đăng nhập từ Safari sang lúc cài, nên thường vào thẳng được; bản iOS cũ hơn thì bắt đăng nhập lại một lần (kèm 2FA). Sau khi cài, app và Safari giữ phiên **riêng**: đăng xuất ở bên này không làm bên kia đăng xuất.

### Android (Chrome)

1. Mở **Chrome**, vào `https://admin.lavieco.io.vn`, đăng nhập.
2. Thẻ **"Cài LAVIECO lên điện thoại"** hiện ở cuối màn hình → bấm **Cài app**.
   Không thấy thẻ (đã bấm "Để sau" trong 14 ngày qua): menu **⋮** → **Cài đặt ứng dụng** / **Thêm vào màn hình chính**.
3. Mở **LAVIECO** từ màn hình chính. Nhấn giữ icon để có lối tắt **Quét check-in** và **Đơn hàng**.

### Máy tính (Chrome / Edge)

Bấm biểu tượng cài đặt ở cuối thanh địa chỉ. Không bắt buộc.

## 2. Bật thông báo

1. Trong app: tab **Thêm** → **Thông báo** (hoặc vào `/notifications`).
2. Bấm **Bật thông báo trên máy này** → **Cho phép**.
3. Bấm **Gửi thử**: vài giây sau phải thấy thông báo "LAVIECO: thông báo đã bật".
4. Ở **Loại thông báo**, bỏ chọn những gì không muốn nhận rồi **Lưu lựa chọn** (áp dụng cho mọi máy của bạn).

| Loại | Khi nào | Ai thấy (theo quyền) |
|---|---|---|
| Đơn vé đã thanh toán | payOS xác nhận một đơn có phí | có `order:read` |
| Đăng ký mới (vé miễn phí) | Có người đặt vé 0 đ thành công | có `order:read` |
| Đơn cần xử lý | Tiền về sau khi hết chỗ (cần hoàn tiền thủ công), hoặc số tiền lệch | có `order:read` |
| Sắp hết chỗ / đã hết chỗ | Lần đầu chương trình vào ngưỡng "sắp hết chỗ" và lần đầu kín chỗ | có `program:read` |
| Liên hệ hợp tác mới | Khi form hợp tác ra mắt (chưa hoạt động) | có `lead:read` |

Thông báo **không bao giờ** chứa tên, email hay SĐT của khách (hiện trên màn hình khoá): chỉ tên chương trình, số vé, số tiền, mã đơn. Bấm vào thông báo mở đúng đơn hoặc chương trình.

**Giới hạn của iPhone:** chỉ nhận thông báo khi đã **cài app lên màn hình chính** (mục 1) và chạy **iOS 16.4 trở lên**. Mở trong Safari thường thì không bật được. Nếu lỡ bấm "Không cho phép": Cài đặt → Thông báo → LAVIECO → bật lại.

**Android:** nếu không thấy thông báo, kiểm tra Cài đặt → Ứng dụng → Chrome (hoặc LAVIECO) → Thông báo, và tắt chế độ tiết kiệm pin quá mạnh cho Chrome.

## 3. Đăng nhập

Phiên đăng nhập **trượt 72 giờ**: dùng app trong vòng 72 giờ thì không phải đăng nhập lại; bỏ không quá 72 giờ thì đăng nhập lại kèm mã 2FA. Đăng xuất: tab **Thêm** → nút đăng xuất cạnh tên bạn.

## 4. Cập nhật app

Không cần làm gì. Mỗi lần deploy, app tự lấy bản mới khi mở lại (service worker kiểm tra `sw.js` mỗi lần mở, tệp tĩnh có mã băm nên không bao giờ dùng nhầm bản cũ). Nếu một thao tác báo "Trang đã có bản mới", đóng hẳn app rồi mở lại.

## 5. Khi app lỗi: gỡ cache

Làm theo thứ tự, dừng khi hết lỗi:

1. **Đóng hẳn app** (vuốt khỏi đa nhiệm) rồi mở lại.
2. **Android (Chrome):** Cài đặt → Ứng dụng → Chrome → Bộ nhớ → **Quản lý dung lượng** → tìm `admin.lavieco.io.vn` → **Xoá**. Hoặc trong Chrome: ⋮ → Cài đặt → Cài đặt trang web → Tất cả trang web → `admin.lavieco.io.vn` → **Xoá dữ liệu**.
3. **iPhone:** Cài đặt → Safari → Nâng cao → **Dữ liệu trang web** → tìm `lavieco.io.vn` → **Xoá**. Nếu vẫn lỗi: nhấn giữ icon LAVIECO → **Xoá ứng dụng**, rồi cài lại theo mục 1.
4. **Máy tính:** DevTools (F12) → **Application** → **Storage** → **Clear site data**.

Xoá dữ liệu sẽ đăng xuất và tắt thông báo trên máy đó: đăng nhập lại và bật lại ở **Thông báo**.

## 6. Mất mạng

Mất mạng thì app hiện trang "Đang mất kết nối" với nút **Thử lại**. App **không lưu** đơn hàng hay danh sách đăng ký trên máy (dữ liệu cá nhân), nên không xem được dữ liệu khi offline. Quét check-in cần mạng.

---

## Phụ lục kỹ thuật (cho người phát triển)

**Tệp:** `apps/admin/src/app/manifest.ts` → `features/pwa` (manifest, màu, đăng ký service worker, gợi ý cài) · `public/sw.js` · `public/offline.html` · `public/icons/` · `src/app/icon.png`, `src/app/apple-icon.png` · `features/notifications` (màn `/notifications`) · `features/shell` (thanh tab dưới đáy: Sự kiện · Đơn hàng · Check-in · Shop · Thêm; đơn vé nằm trong Thêm, `/more`).

**Service worker** (`public/sw.js`, viết tay):

- Chỉ đăng ký ở bản production (`publicEnv.isProductionBuild`); ở `next dev` nó gỡ mọi worker cũ.
- `/_next/static/*` và `/icons/*`: cache-first (giữ 200 mục mới nhất). Điều hướng trang: chỉ mạng, lỗi thì trả `offline.html`. RSC, Server Action, `/api/*`: không đụng tới.
- Đổi cách cache: tăng `VERSION`, cache cũ bị xoá khi worker mới kích hoạt.
- `sw.js` phục vụ với `Cache-Control: no-cache` (`next.config.ts`). Các tệp PWA nằm trong `PUBLIC_PATHS` của `proxy.ts`, thiếu là không cài được.

**Thông báo đẩy:**

```
program-service (đơn đã thanh toán / miễn phí / cần xử lý)
  └─ outbox `order.alert_staff` {orderId, reason}   ← cùng giao dịch với đơn
       └─ StaffAlertService → POST identity /internal/v1/push-notifications
            (notificationId cố định theo job → thử lại không báo trùng)
            └─ identity: staff đang hoạt động × permission × chủ đề đã chọn
                 └─ web-push (VAPID) → dịch vụ đẩy của Google/Apple/Mozilla → sw.js `push`
```

- Khoá VAPID: `npm run keys:generate` in ra `WEB_PUSH_VAPID_PUBLIC_KEY`/`PRIVATE_KEY`, đặt vào `.env` của **identity-service** (xem `docs/06`). Không có khoá thì màn Thông báo báo "máy chủ chưa cấu hình", mọi thứ khác vẫn chạy.
- Thêm một loại thông báo: thêm vào `PUSH_TOPICS` + `PUSH_TOPIC_PERMISSIONS` (`packages/shared/src/identity/push.schema.ts`), chữ ở `features/notifications/constants/text.ts`, rồi service phát nó ghi outbox và gọi `sendPushNotification` từ handler. `lead-service` dùng đúng đường này cho `lead_new` khi được dựng.
- Thử trên máy: `npm run build -w @lavieco/admin && npm run start -w @lavieco/admin`, mở `http://localhost:3001` (localhost được coi là bảo mật), cấu hình khoá VAPID cho identity ở `.env.local`.

**Kiểm tra cài đặt được:** Chrome DevTools → Application → Manifest (không có cảnh báo) và Service workers (`sw.js` activated, scope `/`). Lighthouse bản hiện tại không còn mục "PWA" riêng; dùng tab Application thay thế.
