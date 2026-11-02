# ADR-0026: Email hàng loạt qua hàng đợi trong MongoDB, có hạn mức riêng

**Trạng thái:** Chấp nhận · **Ngày:** 02/11/2026

## Bối cảnh

Cần gửi thư cảm ơn, mời feedback, thông báo tới nhiều người. Brevo giới hạn 300 email/ngày, dùng chung với OTP và email vé (ADR-0023). Nếu chiến dịch ăn hết hạn mức, khách không nhận được OTP để đặt vé.

## Quyết định

- Hàng đợi là collection `campaign_recipients`, worker là một scheduler chạy mỗi phút trong `program-service`, giống job hết hạn giữ chỗ. Không thêm broker (`docs/02` §14.1).
- Hai giới hạn: `CAMPAIGN_RATE_PER_MINUTE` mỗi lượt chạy và `CAMPAIGN_DAILY_LIMIT` (mặc định 150) mỗi ngày theo giờ Việt Nam, đếm nguyên tử ở `campaign_daily_usage`. Hết hạn mức thì dừng, hôm sau tự gửi tiếp. OTP và email vé không đi qua hàng đợi này nên không bị ảnh hưởng.
- Nhận việc bằng cập nhật nguyên tử `queued → sending`, nên nhiều instance không gửi trùng. Lỗi thử lại tối đa 3 lần, cách 15 phút. Lượt nhận quá 10 phút trả lại hàng đợi.
- Gửi bên ngoài giao dịch, không qua outbox: outbox không có hạn mức và không theo dõi được từng người nhận.
- An toàn khi gửi: `campaign:send`, step-up (ADR-0021), gõ lại đúng số người nhận, audit không chứa người nhận.
- Huỷ nhận: link một chạm dạng `<recipientId>.<HMAC>` (không có email trong link), header `List-Unsubscribe` và `List-Unsubscribe-Post` (RFC 8058). `email_suppressions` được kiểm tra cả khi dựng danh sách lẫn ngay trước khi gửi.
- "Sau sự kiện" mặc định tạo nháp để admin duyệt. Chế độ tự gửi chỉ người có `campaign:send` mới bật được, vì lúc gửi không còn ai xác nhận.

## Hệ quả

- Tốc độ bị giới hạn có chủ đích: 500 người với hạn mức 150 mất 4 ngày. Giao diện báo trước số ngày.
- Lỗi cứng từ nhà cung cấp (hard bounce) chưa tự vào `email_suppressions`: cần webhook Brevo, để sau.
- Email thử không tính vào hạn mức chiến dịch nhưng vẫn tính vào hạn mức Brevo.
- Thư thông báo tới khách cũ là tiếp thị. **Cần xác nhận với người phụ trách pháp lý** rằng căn cứ xử lý dữ liệu (ô đồng ý lúc đặt vé) bao phủ việc này, trước khi gửi loại `announcement` hay tệp "mọi khách đã mua" ở production.
- Nếu đổi sang gói Brevo lớn hơn thì chỉ cần đổi biến môi trường.
