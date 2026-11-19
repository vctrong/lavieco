# ADR-0030: Sổ đơn hàng nội bộ, danh mục đơn giá và Google Sheet chỉ xem

**Trạng thái:** Chấp nhận · **Ngày:** 20/11/2026 · **Liên quan:** ADR-0018, ADR-0021, ADR-0027, ADR-0028, `docs/01` §6.3d (UC-41 → UC-44), `docs/03` §9.4–9.5, `docs/06`

## Bối cảnh

Đội 5–6 người nhận đơn tay qua Facebook, Zalo, Threads, TikTok và trực tiếp, ghi trong một Google Sheet (`DonHang`, `ChiTiet`, `DonGia`). Website đã có cửa hàng (ADR-0028) với `shop_orders`, nhưng đơn tay không hợp với mô hình đó: không OTP email, không payOS, không giữ hàng, nhiều món làm theo đơn nên không có tồn kho. Đội cần **một nơi** xem mọi đơn (cả đơn website) trên điện thoại, chủ yếu qua PWA admin, và vẫn muốn một bản Sheet để xem nhanh.

## Quyết định

1. **Module `sales-orders` trong `program-service`**, không thêm service. Lý do: đơn website đang ở đây, bản phản chiếu phải ghi **cùng giao dịch** với `shop_orders` (luật cứng: giao dịch chỉ trong một service); outbox, audit, Excel, push cũng ở đây.
2. **Collection riêng `sales_orders`** (không gộp vào `shop_orders`, không dùng tên `orders` vì đã là đơn vé). Mã:
   - Đơn tay: `LV-0001`, tăng dần qua `counters` (`_id: "sales_order"`, `$inc` trong giao dịch).
   - Đơn website: giữ mã `LVS-…` của cửa hàng.
3. **Phản chiếu đơn website.** Repository của `shop-orders` được bọc (`MirroringShopOrderRepository`): mỗi `insert`/`transition` gọi `WebOrderMirror.sync` trong cùng giao dịch.
   - Trạng thái, tiền và thanh toán lấy từ đơn shop (12 trạng thái gộp về 5). Người phụ trách, ngày giao, ghi chú là của đội và không bị ghi đè.
   - Checkout payOS bỏ dở (`awaiting_payment` rồi `expired`) không vào sổ.
   - Đơn website không đổi trạng thái hay xoá được ở sổ; muốn đổi thì làm trong `/shop/orders`.
   - Lệnh `sales:mirror-web` đưa các đơn có từ trước vào sổ.
4. **Danh mục đơn giá riêng** (`price_list_items`: tên, giá, đang bán, ghi chú). Không có ảnh, story card hay tồn kho. Dòng đơn chụp lại `name` và `unitPrice` lúc tạo đơn, nên đổi giá không ảnh hưởng đơn cũ. Mục danh mục chỉ tắt, không xoá.
5. **Tổng tiền do service tính** (`subtotal = Σ unitPrice × quantity`, `total = subtotal + shippingFee − discount`), không nhận từ client. Đơn `made_to_order` phải có ngày giao, trừ khi đã huỷ. Xoá là xoá mềm (`deletedAt`), có khôi phục; xoá, khôi phục, đổi hàng loạt và sửa danh mục đều ghi audit.
6. **Enum tiếng Anh**, nhãn tiếng Việt ở `text.ts`: `in_stock|made_to_order|wholesale`, `new|in_progress|shipping|completed|cancelled`, `unpaid|deposit_paid|paid`, `bank_transfer|cod|cash`, kênh `facebook|tiktok|website|zalo|in_person|threads|other`.
7. **Permission `sales:read` và `sales:write`.**
   - `sales:read`: cả bốn vai trò.
   - `sales:write`: Super Admin, Content Editor, Coordinator. Auditor vẫn chỉ đọc theo định nghĩa vai trò.
8. **Người phụ trách** là tài khoản staff có thật: identity mở `GET /internal/v1/staff-directory` (chỉ `program-service`, chỉ id và tên). Đơn lưu bản chụp `{ id, name }`.
9. **Địa chỉ hai cấp** theo danh mục hành chính sau 01/07/2025 (34 tỉnh/thành, 3.321 phường/xã; nguồn provinces.open-api.vn v2, ảnh chụp trong `@lavieco/shared/geo`).
   - Lưu mã kèm tên. Đơn tay có thêm lựa chọn "Khác" để ghi tự do (ví dụ "Cổng trường, 3h chiều").
   - Checkout website dùng cùng bộ chọn nhưng không có "Khác".
   - Phường được miễn phí giao là danh sách sửa được trong cài đặt cửa hàng (mặc định các phường của quận Ninh Kiều cũ). Nhận trực tiếp ở Trường ĐH FPT Cần Thơ, miễn phí.
10. **Hàng làm theo đơn trên website.** Biến thể có cờ `madeToOrder`:
    - Không nhập tồn kho. Giữ, trừ, nhả hàng chỉ đếm `sold` (cập nhật có điều kiện trong MongoDB) và không bao giờ hết hàng.
    - `products.leadTimeDays` hiện trên trang sản phẩm, và đặt ngày giao đầu tiên cho bản phản chiếu (loại `made_to_order`).
11. **Google Sheet chỉ xem.**
    - Sau mỗi thay đổi, một job outbox ghi lại **toàn bộ** 3 tab: một lần `batchClear` và một lần `batchUpdate`, ghi kiểu `RAW` để giữ số 0 đầu SĐT và không chạy công thức. Dòng 1 là dải tiêu đề gộp ô, chữ lớn, ghi thời điểm cập nhật (kèm dòng nhỏ "chỉ xem"); dòng 2 là tiêu đề cột. Sau mỗi lần ghi, một `spreadsheets.batchUpdate` đặt lại định dạng: cố định 2 dòng đầu (không cố định cột, vì Google không cho gộp ô cắt qua cột cố định), độ rộng, canh lề, `#,##0`, dropdown chip đúng các nhãn app ghi (Người phụ trách là họ tên đầy đủ của tài khoản staff), màu trạng thái, dòng xen kẽ. Field mask phải là đường dẫn đầy đủ (`userEnteredFormat.a,…`).
    - Có lịch chạy lại định kỳ (`SALES_SHEET_SYNC_MINUTES`). Nhiều thay đổi dồn lại chỉ ghi một lần.
    - Xác thực bằng service account: JWT ký bằng `jose` có sẵn, không thêm SDK Google. Chỉ service account được quyền sửa, cả đội chỉ xem.
    - **Sheet chứa PII khách hàng** (tên, SĐT, địa chỉ), đã được đội đồng ý ngày 20/11/2026. Tắt khi chưa đặt đủ `SALES_SHEET_*`.
12. **Dữ liệu cũ** nhập bằng `sales:import-legacy` từ JSON của 3 tab (không bao giờ đọc `sheet1`). Mặc định là chạy thử; chạy lại an toàn theo `legacyCode`. Kiểm tra từng tổng tiền và tổng 1.000.000đ, đánh số `LV-0001…` theo ngày đặt, khớp tên người phụ trách với tài khoản (theo họ tên đầy đủ: "Xuân Anh" → "Nguyễn Đình Xuân Anh"). `--reassign` điền người phụ trách cho đơn đã import mà còn trống, khi tài khoản được tạo sau; không ghi đè lựa chọn đã sửa trong admin.

## Hệ quả

- `program-service` có thêm 3 collection (`sales_orders`, `price_list_items`, `counters`), 2 migration (index; cài đặt cửa hàng có điểm nhận FPT và phường miễn phí), 4 biến môi trường `SALES_SHEET_*`.
- Admin có mục "Đơn hàng" (`/sales`). Ô "Vé" trên tab bar điện thoại được thay bằng ô này; đơn vé vẫn nằm ở "Thêm".
- Ba tab của Sheet bị ghi đè hoàn toàn từ khi bật đồng bộ. `sheet1` không bị đụng tới.
- Bot Zalo (đợt sau) dùng lại các API: view `todo|overdue|shipping|unpaid`, `summary`. Cần thêm một bên gọi có service token, qua `@AllowServices`.
- Lưu giữ PII của `sales_orders` theo DQ8 khi job ẩn danh được làm (`TODO(dq8-anonymize)`).
