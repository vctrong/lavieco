# Runbook: payOS (thanh toán vé) trên máy dev

Áp dụng từ Phase 3 (17/10/2026). Kiến trúc ở ADR-015: payOS là module `payments` của `program-service`. Webhook đi vào Route Handler của `web` (`/api/payments/payos/webhook`), rồi được chuyển nguyên văn sang service để xác minh chữ ký.

payOS **không có môi trường sandbox**. Mọi lần test thanh toán đều là chuyển khoản thật vào tài khoản đã liên kết với kênh thanh toán. Hãy dùng số tiền nhỏ (ví dụ 2.000 đ) và tự hoàn lại sau.

## 1. Khoá của kênh thanh toán

1. Đăng nhập https://my.payos.vn → **Kênh thanh toán** → chọn kênh (nên tạo **kênh riêng cho dev**, tách khỏi kênh production).
2. Mục **Thông tin tích hợp**: lấy `Client ID`, `Api Key`, `Checksum Key`.
3. Điền vào `services/program-service/.env.local`: `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`. Đủ cả ba thì mới bật payOS; thiếu thì chương trình có phí từ chối đặt vé (`payment.unavailable`), chương trình miễn phí vẫn chạy.
4. Không dán các khoá này vào chat/issue. `Checksum Key` dùng để xác minh webhook: lộ khoá thì đổi ngay trên my.payos.vn và cập nhật `.env.local`.

Xem thêm `docs/06-bien-moi-truong.md` (mục `program-service`).

## 2. Mở tunnel HTTPS để payOS gọi được webhook về máy

payOS chỉ gọi URL công khai qua HTTPS. Tunnel phải trỏ vào **`web` (cổng 3000)**, không bao giờ trỏ vào service (4004).

**Cách A: cloudflared** (không cần tài khoản cho tunnel tạm):

```
cloudflared tunnel --url http://localhost:3000
```

Lệnh in ra một URL dạng `https://<tên-ngẫu-nhiên>.trycloudflare.com`.

**Cách B: ngrok** (cần tài khoản miễn phí và `ngrok config add-authtoken <token>` một lần):

```
ngrok http 3000
```

Lấy URL `https://….ngrok-free.app` trong dòng `Forwarding`.

Lưu ý:

- URL tunnel tạm **đổi mỗi lần chạy lại**. Mỗi lần đổi phải đăng ký lại webhook (mục 3).
- Để payOS chuyển người mua về đúng trang sau khi thanh toán, đặt `WEB_APP_URL` của `program-service` (và `NEXT_PUBLIC_SITE_URL` của `web` nếu cần) bằng URL tunnel, rồi **tắt hẳn và chạy lại** `npm run dev`. Nếu không đặt, thanh toán vẫn được ghi nhận qua webhook; chỉ có nút quay về trang LAVIECO là trỏ về `localhost`.

## 3. Đăng ký URL webhook với payOS

Khi `web` và `program-service` đang chạy và tunnel đang mở:

```
npm run payos:webhook -- https://<url-tunnel>/api/payments/payos/webhook
```

- Lệnh build `program-service` rồi gọi `webhooks.confirm` của SDK `@payos/node` 2.0.5.
- payOS gửi một giao dịch mẫu (`orderCode` 123) tới URL. Service xác minh chữ ký và trả 200 vì không có đơn nào khớp. Đăng ký thành công thì lệnh in `payOS webhook registered: …`.
- Lỗi `Webhook validation failed` thường do: tunnel chưa trỏ đúng cổng 3000; `web` chưa chạy; `PROGRAM_SERVICE_URL` hoặc service token của `web` sai; checksum key không khớp kênh.
- Có thể đăng ký tay trên my.payos.vn (Kênh thanh toán → Webhook) với cùng URL.

## 4. Test bằng giao dịch thật số tiền nhỏ

1. Ở admin, tạo chương trình có một loại vé giá nhỏ (ví dụ 2.000 đ), rồi xuất bản.
2. Trên web (mở qua URL tunnel hoặc localhost): `/chuong-trinh/<slug>` → chọn vé → nhập thông tin → OTP (mã xem ở Mailpit http://localhost:8025) → màn thanh toán có QR VietQR.
3. Quét QR bằng app ngân hàng và chuyển đúng số tiền, đúng nội dung.
4. Trong vài giây, trang thanh toán (poll mỗi 3 giây) chuyển sang "đã thanh toán", vé hiện ra, và email vé xuất hiện ở Mailpit.
5. Kiểm tra trong admin → Đơn hàng: đơn `paid`, tab thanh toán có một sự kiện `webhook` với kết quả `paid`.
6. Hoàn tiền: chuyển khoản trả lại thủ công, rồi bấm "Đánh dấu đã hoàn tiền" (cần nhập lại mã TOTP). Vé bị huỷ (void) và chỗ được trả lại.

Kiểm tra thêm các tình huống (không bắt buộc mỗi lần):

- **Quay về trước khi webhook tới:** trang kết quả gọi đối soát với payOS (`paymentRequests.get`). `returnUrl` không bao giờ tự xác nhận thanh toán.
- **Webhook không tới** (tunnel tắt): ở admin bấm "Kiểm tra lại thanh toán". Lệnh này dùng chung hàm ghi nhận thanh toán với webhook, nên webhook tới sau cũng không phát hành vé lần hai.
- **Trả tiền sau khi đơn hết hạn hoặc đã huỷ:** nếu còn chỗ thì đơn vẫn thành `paid` (cờ `latePayment`). Nếu hết chỗ thì đơn `paid` có cờ "cần hoàn tiền", admin thấy cảnh báo.

## 5. Production

- Kênh thanh toán production riêng. Khoá đặt trong kho bí mật của môi trường triển khai.
- URL webhook: `https://lavieco.io.vn/api/payments/payos/webhook`. Đăng ký **một lần** sau mỗi lần đổi kênh hoặc tên miền (chạy `npm run payos:webhook -- …` từ máy có env production, hoặc đăng ký tay trên my.payos.vn).
- `description` của link luôn là `LAVIECO` (7 ký tự), vì giới hạn 9 ký tự của tài khoản không liên kết qua payOS.
- Link thanh toán hết hạn không muộn hơn hạn giữ chỗ 15 phút (`expiredAt` làm tròn xuống theo giây).
