# ADR-023: Brevo làm đường gửi email chính, Gmail SMTP làm dự phòng (hướng xử lý AQ8)

| | |
|---|---|
| **Trạng thái** | Đề xuất (Proposed). Chờ đội duyệt |
| **Ngày** | 20/10/2026 |
| **Người đề xuất** | V.C. Trọng |
| **Liên quan** | `docs/02` §16 (ADR-011), §17.2 (AQ8); `docs/06` mục "Gửi email thật (SMTP)"; `docs/runbooks/deploy-vps.md`; ADR-022 |
| **Thay cho** | Cấu hình hiện tại: một khối `SMTP_*` trỏ thẳng Gmail cá nhân |

## Bối cảnh

`identity-service` (mã OTP, link mời, email member) và `program-service` (email vé) gửi email qua Nodemailer với một khối `SMTP_*`. Ở production khối này đang trỏ tới Gmail SMTP bằng App Password. Khi gửi nhiều, Gmail cá nhân giữ hoặc trì hoãn thư, nên có mã OTP tới sau khi đã hết hạn. Gmail cũng ghi đè người gửi `@lavieco.io.vn`, nên người nhận thấy địa chỉ Gmail cá nhân.

Tên miền `lavieco.io.vn` đã được xác minh trên Brevo (SPF/DKIM). Gói miễn phí của Brevo cho 300 email/ngày, đủ cho lưu lượng GĐ1 nhưng có thể chạm trần trong ngày mở bán vé. AQ8 (nhà cung cấp email giao dịch, tên miền gửi) và ADR-011 vẫn còn mở.

## Quyết định

1. **Hai đường gửi, cùng giao thức SMTP qua Nodemailer**, nằm trong `@lavieco/service-kit` `notify` (`FailoverEmailSender`). Không thêm SDK hay thư viện mới. Port `EmailSender.send(message)` giữ nguyên tên và trả về `{ provider: "brevo" | "gmail", messageId }`.
   - **Chính: Brevo SMTP relay** (`BREVO_SMTP_HOST` mặc định `smtp-relay.brevo.com`, `BREVO_SMTP_PORT` mặc định `587` STARTTLS, `BREVO_SMTP_USER`, `BREVO_SMTP_KEY`). Người gửi `MAIL_FROM` thuộc tên miền đã xác minh.
   - **Dự phòng: khối `SMTP_*` hiện có** (Gmail ở production, Mailpit ở dev). Người gửi `MAIL_FROM_FALLBACK`, phải là chính địa chỉ Gmail.
   - `MAIL_REPLY_TO` (tuỳ chọn) đặt `Reply-To` ở cả hai đường.
2. **Chuyển đường:** Brevo lỗi vì **bất kỳ lý do gì** (đăng nhập, hết hạn mức, quá thời gian chờ, từ chối địa chỉ...) thì ghi log `warn` (kèm `smtpCode`/`responseCode`) và gửi lại ngay qua `SMTP_*`. Sau một lần lỗi, Brevo bị bỏ qua trong `BREVO_COOLDOWN_MINUTES` (mặc định 15). Trong thời gian đó email đi thẳng Gmail, hết thời gian thì thử lại Brevo. Trạng thái này nằm trong bộ nhớ từng process, không lưu DB và không chia sẻ giữa hai service.
3. **Cả hai đường lỗi** thì ném một `AggregateError` chứa hai lỗi gốc. Luồng gọi xử lý như trước: OTP báo lỗi cho người dùng để thử lại, outbox (email vé, email đổi mật khẩu) thử lại theo lịch.
4. **Không có `BREVO_SMTP_KEY`** thì chỉ dùng `SMTP_*`. Dev và CI không cần Brevo.
5. **Thời gian chờ:** Brevo 5 s kết nối / 5 s chào / 8 s socket; `SMTP_*` giữ 10 / 10 / 20 s. Brevo ngắn để khi nó treo vẫn còn thời gian gửi qua Gmail trong 20 s mà `web` chờ một yêu cầu OTP. Không đổi TTL OTP, không đổi thời gian chờ phía `web`.
6. **Cấu hình được kiểm tra lúc khởi động** (`mailConfigIssue`, và bản sao trong `env:check`): có `BREVO_SMTP_KEY` thì phải có `BREVO_SMTP_USER` (và ngược lại), phải có `MAIL_FROM_FALLBACK`, và `MAIL_FROM_FALLBACK` phải khác tên miền của `MAIL_FROM` (trừ khi `MAIL_FROM` là Gmail). Gmail gửi với người gửi `@lavieco.io.vn` sẽ trượt DMARC. Sai thì service từ chối khởi động, chỉ in tên biến.
7. **Log** mỗi lần gửi qua logger chung: `provider`, `messageId`, `durationMs`, `recipient` đã che (`t***@gmail.com`). Không log mã OTP, tiêu đề, nội dung, key hay mật khẩu (S7).
8. **Khối mail phải trùng nhau** giữa `identity-service` và `program-service` (mẫu env ghi rõ).
9. `npm run mail:test` có thêm `--provider=auto|brevo|gmail` để thử riêng từng đường.

## Hệ quả

- OTP và email vé đi qua tên miền đã xác minh, ít vào Spam hơn, và không còn bị Gmail cá nhân giữ thư trong điều kiện bình thường.
- Khi Brevo hết hạn mức hoặc sự cố, email vẫn đi (qua Gmail) thay vì lỗi. Người nhận khi đó thấy người gửi là địa chỉ Gmail; `Reply-To` giữ cho thư trả lời về cùng một hộp thư.
- Hai bí mật cần quản lý trên VPS (`BREVO_SMTP_KEY`, `SMTP_PASS`), đặt giống nhau ở hai tệp env.
- **Rủi ro còn lại:**
  - Ở lần đầu Brevo **treo** (không trả lời), một yêu cầu OTP có thể mất tối đa khoảng 8 s (socket Brevo, thường ít hơn) cộng thời gian gửi qua Gmail. Nếu Gmail cũng chậm (trên khoảng 12 s), `web` vẫn có thể báo lỗi sau 20 s dù email vẫn tới. Từ yêu cầu kế tiếp, cooldown cho email đi thẳng Gmail.
  - Thời gian chờ chỉ giới hạn từng pha (kết nối, chào, im lặng của socket), không giới hạn tổng thời gian. Một máy chủ trả lời nhỏ giọt có thể kéo dài hơn.
  - Cooldown nằm trong từng process: sau khi khởi động lại, hoặc ở service kia, lần gửi đầu vẫn thử Brevo.
  - Gmail cá nhân vẫn có giới hạn (khoảng 500 email/ngày) và vẫn có thể trì hoãn thư. Khi Brevo bị bỏ qua lâu (hết hạn mức), OTP có thể lại tới chậm như trước.
  - Lỗi nằm ở phía Brevo sau khi đã nhận thư (thư bị trả về muộn) không được phát hiện, vì Brevo đã trả lời "đã nhận".

## Chuyển tiếp sau này

- Khi lưu lượng vượt 300 email/ngày thường xuyên: nâng gói Brevo, hoặc tách email vé (gửi qua outbox, không gấp) khỏi OTP.
- Muốn bỏ Gmail dự phòng: để trống `SMTP_*` là không còn đủ, vì `SMTP_HOST` vẫn bắt buộc. Cần một ADR mới (ví dụ dự phòng bằng nhà cung cấp thứ hai có tên miền đã xác minh).
- Nếu cần chia sẻ trạng thái cooldown giữa các process, xem lại khi có nhiều bản sao service (GĐ2).

## Việc cần làm sau khi ADR được duyệt

- `docs/02` §16: đổi ADR-011 sang "Thay bằng ADR-023"; §17.2: đánh dấu AQ8 đã chốt; `CLAUDE.md` §15: bỏ AQ8 khỏi danh sách mở.
- Theo dõi log `mail provider failed, falling back` vài tuần đầu để chỉnh `BREVO_COOLDOWN_MINUTES`.
