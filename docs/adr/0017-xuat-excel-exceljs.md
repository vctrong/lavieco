# ADR-017: Xuất danh sách người đăng ký bằng `exceljs`

| | |
|---|---|
| **Trạng thái** | Chấp nhận |
| **Ngày** | 17/10/2026 |
| **Người đề xuất** | V.C. Trọng |
| **Liên quan** | `docs/05` §5.8, ADR-014 |

## Bối cảnh

Admin cần tải `.xlsx` danh sách người đăng ký của từng chương trình, gồm một cột cho mỗi câu hỏi form tuỳ chỉnh (kể cả câu đã ẩn). File phải stream được, có header đậm, freeze dòng đầu, độ rộng cột tự động.

## Quyết định

1. Dùng **`exceljs`** (streaming writer) trong `program-service`, endpoint `GET /internal/v1/events/:id/registrations/export`. CSV UTF-8 là tuỳ chọn phụ.
2. Xuất dữ liệu cá nhân phải **xác thực lại (step-up)** và **ghi audit**, giống xuất lead (`docs/02` §9.2). Permission `registration:export`.
3. Tên file `LAVIECO_<slug>_<yyyy-mm-dd>.xlsx`, ngày theo Asia/Ho_Chi_Minh.
4. **Định dạng chung (bổ sung 17/11/2026).** Mọi file Excel của service đi qua `ExcelWorkbookWriter`, nhận một `Workbook` có **kiểu cột** (`index`, `text`, `longText`, `code`, `number`, `money`, `dateTime`, `status`) thay vì mảng chuỗi. Bộ ghi lo phần trình bày: tiêu đề Deep Blue + bộ lọc, cố định dòng đầu và 2 cột đầu, dòng xen màu, số và tiền VND là số thật, ngày giờ hiển thị giờ Việt Nam, SĐT/mã giữ dạng chữ, trạng thái tô màu theo token, chữ dài tự xuống dòng (chiều cao dòng tính sẵn vì Excel không tự giãn), khổ in A4 ngang, sheet "Tổng quan" tuỳ chọn. Màu là bản sao ARGB của `theme.css` ở `sheet-tokens.ts`. Ô chữ luôn qua `safeCell` ở bộ ghi. Lý do: bản đầu ghi mọi ô dạng chữ không định dạng, nên số/ngày không lọc, sắp xếp, cộng được và file khó đọc.

## Hệ quả

- Thêm một phụ thuộc vào `program-service` (Phase 4). Không đưa vào `packages/`.
