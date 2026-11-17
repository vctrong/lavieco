# ADR-0028: Cửa hàng nằm trong `program-service`

**Trạng thái:** Đề xuất · **Ngày:** 17/11/2026 · **Liên quan:** ADR-0014, ADR-0015, ADR-0017, ADR-0020, ADR-0025, `docs/08-cua-hang-ke-hoach.md`

## Bối cảnh

LAVIECO đã qua giai đoạn bán hàng: sản phẩm minh chứng (và sản phẩm của thương hiệu tái chế đối tác, lớp Truyền thông) được bán online với **giá cố định**, thanh toán payOS. `docs/02` §14.2 dự kiến một `order-service` ở GĐ2 cho đơn combo B2B, còn danh mục sản phẩm là nội dung của `content-service` (`catalog`, chưa dựng).

Bán lẻ cần, trong **một giao dịch**: giữ tồn kho của nhiều biến thể, giữ lượt mã giảm giá, tạo đơn và ghi outbox (luật cứng: giao dịch chỉ trong một service). Một tài khoản payOS chỉ có **một** webhook URL, đang dùng cho đơn vé.

Ba phương án đã cân nhắc (`docs/08` §3.1): (A) module mới trong `program-service`; (B) service mới `commerce-service`; (C) sản phẩm ở `content-service`, đơn ở `program-service`.

## Quyết định

1. **Cửa hàng là nhóm module `shop-*` trong `program-service`**: `shop-catalog` (danh mục, thương hiệu đối tác, sản phẩm, biến thể), `shop-inventory`, `shop-carts`, `shop-orders`, `shop-imports`, `shop-reviews`. Database vẫn là `lavieco_program`.
2. **Tồn kho đi cùng sản phẩm** trong `program-service`. `content-service` `catalog`/`works` không dựng cho sản phẩm bán; trang sản phẩm mang story card và liên kết Cẩm nang (BR-01, BR-20).
3. **payOS dùng chung một gateway và một webhook.** Collection `payment_refs` (`orderCode` unique → `{ kind: event | shop, orderId }`) được ghi cùng giao dịch tạo đơn; webhook và đối soát tra bảng này để gọi đúng settlement. Mã `orderCode` duy nhất trên cả hai loại đơn.
4. **Mã giảm giá toàn app**: `vouchers` thêm scope cho cửa hàng; `VoucherLedger` nhận ngữ cảnh tổng quát (sự kiện hoặc giỏ hàng) thay vì gắn cứng `eventId`.
5. **Sản phẩm tự xuất bản** bởi người có `product:publish` (như BR-17 cho sự kiện), không qua duyệt hai người (BR-05). Số liệu tác động trên sản phẩm vẫn cần `impact:approve` (BR-09, BR-23).
6. **Permission:** `product:read|write|publish|import`; đơn hàng dùng chung tài nguyên `order`: `order:read`, `order:refund` (đã có) + `order:fulfill`, `order:export` (mới).
7. `order-service` ở `docs/02` §14.2 **lùi lại**: chỉ cân nhắc khi điều kiện tách ở dưới thỏa.

## Điều kiện tách sau này

Tách `shop-*` + `payments` + `vouchers` thành `commerce-service` (theo mẫu mở rộng → co lại) khi có một trong: đơn B2B/combo cần quy trình riêng (báo giá, hợp đồng); tải cửa hàng khác hẳn tải sự kiện (đo được); một nhóm người riêng phát hành cửa hàng với nhịp khác.

## Hệ quả

- Không thêm service, database, khoá service token hay cấu hình triển khai. Atlas: custom role của `svc_program` cần thêm các collection mới.
- Tên `program-service` không còn khớp hoàn toàn phạm vi; chấp nhận và ghi ở đây.
- `program-service` lớn hơn: các module `shop-*` chỉ dùng nhau và `orders`/`vouchers`/`payments` qua `index.ts` (S2), không vòng phụ thuộc.
- Dùng lại trực tiếp: OTP chứng thực email (identity), payOS, bộ ghi Excel chung (ADR-0017), email, khảo sát (ADR-0025), chiến dịch (ADR-0026), cảnh báo đẩy cho staff (ADR-0027), ảnh Cloudinary qua `content-service` (ADR-0020, purpose `product_image`).
- BR-10 được sửa: sản phẩm trong Cửa hàng có giá cố định.
