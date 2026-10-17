# ADR-020: Lưu và phát ảnh tải lên bằng Cloudinary

| | |
|---|---|
| **Trạng thái** | Chấp nhận |
| **Ngày** | 18/10/2026 |
| **Người đề xuất** | V.C. Trọng |
| **Liên quan** | `docs/02` §8.2, §8.3, §12.1, AQ4; `docs/03` §5.8, §9.2; `docs/04` §11.1, §15; ADR-014, ADR-018, ADR-019 |

## Bối cảnh

Phase 2b cần tải ảnh thật: ảnh bìa và thư viện ảnh của chương trình (admin), avatar của member (web). `docs/02` §8.2 giả định một bộ chứa tương thích S3 riêng tư (local là MinIO) và tự sinh các kích thước ảnh. Với quy mô GĐ1, tự vận hành bộ chứa + CDN + bộ sinh kích thước là việc không đáng. Cloudinary cho sẵn lưu trữ, CDN, đổi kích thước và định dạng (`f_auto`, `q_auto`).

## Quyết định

1. **Ảnh chỉ đi qua `content-service`.** Trình duyệt gửi ảnh cho BFF (`admin`, `web`), BFF chuyển tiếp cho `content-service` (multipart). Chỉ service gọi Cloudinary, bằng **API đã ký** (signed upload phía server). `CLOUDINARY_API_SECRET` chỉ nằm ở `content-service`. Trình duyệt không bao giờ tải thẳng lên Cloudinary và không có preset unsigned.
2. **Kiểm tra trước khi gửi đi** (ở service, client chỉ kiểm tra để báo lỗi sớm):
   - Loại tệp theo **nội dung thực** (magic bytes): chỉ nhận JPEG, PNG, WebP. HEIC/HEIF/AVIF bị từ chối với mã lỗi riêng để giao diện hiện "Ảnh định dạng HEIC chưa được hỗ trợ, vui lòng chọn ảnh JPG hoặc PNG." SVG và mọi loại khác bị từ chối.
   - Dung lượng theo mục đích: **avatar ≤ 2 MB**, **ảnh chương trình ≤ 8 MB**. Tối đa 40 megapixel (chống ảnh "bom giải nén").
   - `sharp` giải mã, xoay theo EXIF rồi **mã hoá lại không kèm metadata** (xoá EXIF, GPS, ICC thừa). Ảnh gửi lên Cloudinary là bản đã làm sạch, không phải tệp người dùng gửi.
3. **Không phát ảnh gốc.** Ảnh tải lên với `type: private`. Tài khoản bật **Strict transformations**, chỉ các **named transformation** có trong `MEDIA_DELIVERY_WIDTHS` (`packages/shared`) được phép (`t_lv_w<rộng>` = `c_limit,w_<rộng>,f_auto,q_auto`). URL công khai luôn có dạng `https://res.cloudinary.com/<cloud>/image/private/t_lv_w<rộng>/<publicId>`. Lệnh `npm run media:setup -w @lavieco/content-service` tạo/cập nhật các named transformation; bật Strict transformations là thao tác thủ công trong bảng điều khiển (runbook).
4. **Truy cập qua port `MediaStorage`** (`upload`, `destroy`) ở `application/ports` của module `media`; bản cài Cloudinary nằm ở `infrastructure`. Test dùng bản giả trong bộ nhớ. Đổi nhà cung cấp chỉ đổi bản cài đặt.
5. **Dữ liệu:** collection `media` của `lavieco_content` lưu `publicId`, `width`, `height`, `bytes`, `format`, `sha256`, mục đích, trạng thái và chủ sở hữu (`docs/03` §5.8). Nơi dùng ảnh lưu **bản chụp** `{ mediaId, publicId, width, height, alt }` (ví dụ `events.cover` ở `lavieco_program`). `alt` thuộc nơi dùng, không thuộc `media`.
6. **Tách môi trường:** dev và prod là **hai product environment (hoặc hai tài khoản) Cloudinary riêng**, khoá API riêng. Vì khoá API Cloudinary có quyền trên cả tài khoản (không giới hạn được theo folder), khoá dev trên máy lập trình không bao giờ chạm được ảnh prod. Thêm vào đó, folder gốc suy ra từ `NODE_ENV`: `lavieco/prod` khi `production`, còn lại `lavieco/dev`; dưới đó là `events/` và `avatars/`.
7. **Vòng đời và xoá ảnh cũ:**
   - Ảnh mới tải lên ở trạng thái `pending`. Ảnh `pending` quá **24 giờ** bị job dọn của `content-service` xoá.
   - **Ảnh chương trình:** khi lưu chương trình, `program-service` gọi `content-service` để **gắn** ảnh (`attach`, đồng bộ, trước giao dịch; lấy `publicId`/kích thước từ phản hồi chứ không tin client). Ảnh bị thay (đổi ảnh bìa, bỏ khỏi thư viện) hoặc bản nháp bị xoá thì `program-service` ghi outbox **`media.release`** trong cùng giao dịch; worker gọi `content-service` để giải phóng. Nhân bản chương trình **không** sao chép ảnh (một ảnh chỉ thuộc một chương trình).
   - **Avatar:** nằm hẳn ở `content-service` (`owner.userId`, mỗi member tối đa một avatar đang dùng). Đổi hoặc xoá avatar thì ảnh cũ bị giải phóng ngay trong `content-service`. Có sẵn endpoint xoá toàn bộ media của một member cho luồng xoá tài khoản (`TODO(UC-29)`: nối khi `identity-service` có luồng này).
   - Giải phóng = đánh dấu `deleted` + outbox `media.destroy` trong cùng giao dịch; worker xoá tệp ở Cloudinary (thử lại tới khi thành công).
8. **Không lưu ảnh QR.** Ảnh QR (QR vé từ `qrToken`, QR in trên sản phẩm từ `code`) luôn **sinh từ mã khi cần** (hiển thị, email, tệp in). **Bản chụp ánh xạ QR (BR-02) vẫn bắt buộc** (`docs/02` §7.1, `docs/03` §7.3); nơi lưu chọn khi dựng module `qr` (`TODO(qr-snapshot)`, ứng viên: Cloudinary `raw` kiểu `private` hoặc bộ chứa khác).
9. **Bỏ MinIO** khỏi `infra/compose` và tài liệu. Local dùng product environment Cloudinary dev.
10. **Thư viện:** `sharp` và SDK `cloudinary` v2, **chỉ dùng trong `content-service`**.

## AQ4: dữ liệu lưu ngoài nước

Ảnh (kể cả avatar, là dữ liệu cá nhân) được lưu ở hạ tầng Cloudinary ngoài Việt Nam. **Chấp nhận ở GĐ1** vì: chưa có pháp nhân, quy mô thí điểm nhỏ, ảnh đã xoá EXIF/GPS, avatar là tuỳ chọn và xoá được bất kỳ lúc nào. **Xem lại** khi xảy ra một trong các điều kiện:

1. LAVIECO có pháp nhân (tham vấn pháp lý về lưu trữ/chuyển dữ liệu cá nhân ra nước ngoài).
2. Số member có avatar hoặc lưu lượng ảnh tăng đáng kể (ví dụ > 5.000 avatar, hoặc vượt gói miễn phí).
3. Có yêu cầu từ đối tác (trường học, cơ quan) về nơi lưu dữ liệu.

## Hệ quả

- Không còn bucket/CDN tự vận hành, không có MinIO ở local; lập trình viên cần khoá của product environment dev (`docs/runbooks/chay-local.md`).
- `program-service` trở thành bên gọi của `content-service` (`@AllowServices("program-service")` cho `attach`/`release`), cần `SERVICE_TOKEN_PRIVATE_JWK` và `CONTENT_SERVICE_URL`.
- `web`/`admin` hiển thị ảnh bằng `next/image` với loader dựng URL named transformation; cần `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (không bí mật). Hiện CSP chỉ có `frame-ancestors`; khi thêm `img-src` thì phải cho phép `https://res.cloudinary.com`.
- Cloudinary lỗi: tải ảnh mới thất bại (`503`); ảnh đã có vẫn phục vụ từ CDN của Cloudinary.
- Có thể có ảnh mồ côi khi `attach` thành công nhưng giao dịch lưu chương trình thất bại; chấp nhận ở GĐ1 (hiếm, chi phí nhỏ), ghi nhận nếu cần job đối soát sau.

## Điều kiện xem lại

Mở lại ADR này khi: điều kiện AQ4 ở trên xảy ra; chi phí Cloudinary vượt ngân sách hạ tầng; hoặc cần lưu tệp không phải ảnh (tài liệu, video) với yêu cầu riêng tư khác.
