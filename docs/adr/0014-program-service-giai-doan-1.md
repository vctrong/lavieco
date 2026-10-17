# ADR-014: Đưa `program-service` (sự kiện, vé, check-in) vào Giai đoạn 1

| | |
|---|---|
| **Trạng thái** | Chấp nhận |
| **Ngày** | 17/10/2026 |
| **Người đề xuất** | V.C. Trọng |
| **Liên quan** | `docs/05`, `docs/01` §3.1, `docs/02` §4.1 và §14, ADR-015, ADR-016 |

## Bối cảnh

`docs/02` §14.2 xếp `program-service` vào GĐ2 và `docs/01` A1 ghi GĐ1 không có thanh toán online. Đội quyết định mở tab "Chương trình" có đăng ký, mua vé, nhận vé QR qua email và check-in ngay ở GĐ1 (`docs/05`). Nghiệp vụ này có dữ liệu riêng (sự kiện, loại vé, đơn, vé, câu trả lời form), vòng đời riêng và yêu cầu giao dịch nguyên tử (giữ chỗ, phát hành vé), không khớp với `content-service` (nội dung xuất bản) hay `lead-service` (liên hệ đến).

## Quyết định

1. Thêm **`program-service`** (NestJS, database `lavieco_program`, tài khoản DB riêng) ngay ở GĐ1. Điều kiện ở `docs/02` §14.1 được thỏa theo mục (3): dữ liệu và ranh giới đã rõ, khớp một bounded context.
2. Trong code, miền này mang tên **`events`** (module `events`, route admin `/events`). UI vẫn hiển thị "Chương trình". Tên `programs`/`program_pages` giữ cho **mô tả công khai** trong `content-service` (bốn nấc thang), tránh trùng nghĩa.
3. Module dự kiến: `events`, `event-types`, `ticketing`, `orders`, `tickets`, `checkin`, `registrations` (câu trả lời form, xuất Excel), `payments` (ADR-015), `outbox`, `idempotency`, `jobs`.
   - **Cập nhật Phase 3 (17/10/2026):** vé (`tickets`) nằm trong module `orders` cùng đơn, câu trả lời, `payment_events`, job hết hạn giữ chỗ và hàm ghi nhận thanh toán dùng chung (một giao dịch cho đơn + chỗ + vé). `payments` chỉ chứa client payOS và webhook. Thêm module `audit` (gửi audit sang identity qua outbox, ADR-021). Không có module `idempotency`: checkout idempotent theo `verificationId` của bằng chứng email.
4. Permission mới: `program:read`, `program:write`, `order:read`, `order:refund`, `registration:export`, `checkin:perform` (`docs/02` §9.3).
5. Vòng đời sự kiện: `draft → published → closed | ended`, xem trước theo quyền, **không cần người duyệt thứ hai** (khác mẫu publishable của BR-05). Được gỡ xuất bản về `draft` khi chưa có ai đăng ký.

## Hệ quả

- GĐ1 có **6 thành phần**: `web`, `admin`, `identity-service`, `content-service`, `lead-service`, `program-service`.
- `docs/01`, `02`, `03`, `04`, `CLAUDE.md` được cập nhật trong cùng thay đổi. Collection chi tiết của `lavieco_program` chốt ở Phase 2 (`docs/03` §9.2 ghi phác thảo).
- Chi phí vận hành tăng một service. Điều kiện lùi về monolith có module (`docs/02` §15.2) vẫn áp dụng.
