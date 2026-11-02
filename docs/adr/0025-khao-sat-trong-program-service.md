# ADR-0025: Khảo sát nằm trong `program-service`

**Trạng thái:** Chấp nhận · **Ngày:** 02/11/2026

## Bối cảnh

Cần hai loại khảo sát: độc lập (đồ án, nghiên cứu) và feedback sự kiện theo từng vé (`docs/ke-hoach-chuong-trinh-v2.md` mục 7). `lead-service` cũng thu dữ liệu từ form công khai nên là một lựa chọn.

## Quyết định

Đặt module `surveys` trong `program-service`. Feedback sự kiện cần token chia sẻ vé, sự kiện và vé đã check-in, đều thuộc service này; đặt chỗ khác phải gọi HTTP chéo cho mỗi lần mở link. Dùng lại được kiểm tra câu trả lời của form đăng ký, bộ ghi Excel (ADR-0017), bộ giới hạn tần suất và audit.

Khảo sát độc lập không gắn với sự kiện nhưng vẫn ở đây, để chỉ có một mô hình câu hỏi và một màn kết quả.

## Hệ quả

- Không thêm service hay database mới; `lavieco_program` có thêm `surveys`, `survey_responses`.
- Khảo sát ẩn danh chỉ lưu HMAC theo từng khảo sát để chặn trả lời trùng, không lưu vé, đơn, email hay tên. Không đổi được tính ẩn danh sau khi đã có người trả lời.
- Không thu dữ liệu học sinh (BR-08) là trách nhiệm của người soạn câu hỏi: form builder nhắc điều này, hệ thống không kiểm tra được nội dung câu hỏi.
- Nếu khảo sát độc lập tăng nhiều và không còn liên quan đến chương trình thì xem lại việc tách ra.
