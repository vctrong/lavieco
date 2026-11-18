# ADR-0029: Cẩm nang Xanh số là các trang ảnh, có phiên bản cho cả cuốn

**Trạng thái:** Chấp nhận · **Ngày:** 19/11/2026 · **Liên quan:** ADR-0018, ADR-0020, ADR-0021, ADR-0027, `docs/01` UC-02/UC-22, `docs/03` §5.1, `docs/07`

## Bối cảnh

`docs/03` §5.1 thiết kế Cẩm nang là các **chương có khối nội dung** (heading, đoạn văn, ảnh, khối "lật mở"…), soạn trong admin và duyệt hai người (BR-05). Thực tế: **nhóm đồ hoạ tự thiết kế từng trang sổ** (khổ A5 dọc) trong Illustrator/InDesign/Canva và xuất ra **PDF hoặc ảnh**. Dựng lại các trang đó bằng HTML vừa tốn công, vừa không giữ được thiết kế. Web chỉ cần làm "khung đọc sổ" quanh các trang ảnh. Mỗi trang vẫn cần **chữ** để tìm kiếm, SEO và để LaviAgent đọc.

## Quyết định

1. **Trang là ảnh, kèm chữ.** Một trang: ảnh (Cloudinary, `media` purpose `handbook_page`, lưu JPEG đã làm sạch), `text` (lấy từ PDF hoặc gõ tay; `textSource` `pdf|manual|none`), `title`, `alt`, `hotspots[]` (vùng bấm theo %, đích: sản phẩm, trang khác, video YouTube/TikTok, URL https, LaviAgent). Bỏ mô hình khối ở `docs/03` §5.1.
2. **Phiên bản cho cả cuốn.** `handbooks` (con trỏ `publishedVersionId`, `draftVersionId`, `lastNumber`) + `handbook_versions` (mỗi bản là **bản chụp đầy đủ** chương + trang, ≤ 300 trang). Một bản nháp tại một thời điểm (partial unique index). Xuất bản = nháp thành `published`, bản cũ `archived`. **Khôi phục = xuất bản bản sao của bản cũ thành số phiên bản mới**: lịch sử chỉ tăng.
3. **Id trang và chương ổn định** qua các phiên bản (UUID), cùng `key` 8 ký tự Crockford ngẫu nhiên cho địa chỉ công khai `/cam-nang/trang/<key>`. Thay cả cuốn bằng PDF mới thì trang N giữ id/key/chương/điểm bấm của trang N cũ.
4. **Tự xuất bản (BR-26), không duyệt hai người.** Ai có `handbook:publish` xuất bản bản nháp, **bắt buộc ghi chú phiên bản**; mỗi lần xuất bản/khôi phục ghi audit (gửi qua outbox → `identity`, như program-service, ADR-0021) và gửi **thông báo đẩy** cho staff (topic `handbook_published`, ADR-0027): "<tên người> đã xuất bản Cẩm nang Xanh số phiên bản N — <ghi chú>", bấm mở `/handbook/history`. Tên hiển thị của staff là ngoại lệ có chủ đích với quy tắc "thông báo không PII" (yêu cầu của đội, chỉ staff nhận, không bao giờ là dữ liệu bạn đọc/khách).
5. **Permission mới:** `handbook:read` (cả bốn vai trò), `handbook:write`, `handbook:publish` (Super Admin, Content Editor). `content:*` không dùng cho Cẩm nang.
6. **Xử lý PDF trong `content-service` bằng poppler** (`pdfinfo`, `pdftoppm`, `pdftotext`), chạy như tiến trình riêng, từng trang một, `nice -n 10`, timeout 60 giây/trang, một job tại một thời điểm. Không dùng Cloudinary `pg_N`: gói Cloudinary thường **chặn phát PDF**, giới hạn 10–20 MB/file, strict transformations phải mở từng tổ hợp `pg_N/lv_wX`, và PDF thô mang metadata lên Cloudinary (trái ADR-0020); vẫn phải có công cụ lấy chữ riêng. Image tăng khoảng 26 MB (`poppler-utils` + `font-liberation`). Đo trong Docker giới hạn 1 CPU: 48 trang đơn giản render ~9 giây, lấy chữ ~1,5 giây; trang nhiều ảnh nhúng ước 0,5–1,5 giây/trang, cả cuốn kèm upload Cloudinary khoảng 1–2,5 phút.
7. **Upload theo khúc 6 MB** (admin BFF → `content-service`, ghi xuống đĩa), vì Caddy và `proxy.ts` của admin giới hạn 10 MB/request. PDF ≤ 200 MB, ảnh ≤ 25 MB. Kiểm tra loại theo nội dung thật ở khúc đầu.
8. **Nhập chạy nền**: `handbook_import_jobs` có tiến độ và vị trí hàng đợi, worker trong service (lease, chạy lại an toàn). Trang có ít hơn 20 ký tự chữ gắn cờ "Thiếu chữ"; dưới 50% trang có chữ thì cảnh báo (không chặn). `TextExtractor` là port: OCR cắm vào sau (`TODO(handbook-ocr)`).
9. **Tiết kiệm Cloudinary:** ảnh trang trùng nội dung (cùng SHA-256 sau khi làm sạch) dùng lại media cũ, không up lại. Chỉ giữ ảnh của bản đang xuất bản, bản nháp và **3 phiên bản đã xuất bản gần nhất**; job dọn (6 giờ/lần, chờ 24 giờ an toàn) giải phóng ảnh mồ côi qua outbox `media.destroy`. Bản cũ hơn vẫn còn trong lịch sử nhưng không khôi phục được.
10. **Đọc công khai** qua `GET /internal/v1/published-handbook*` (chỉ `web`, service token): cả cuốn không kèm chữ, từng trang kèm chữ, tìm kiếm không dấu, xuất chữ theo trang (cho RAG của LaviAgent sau này), xem trước bản nháp bằng token 10 phút. Sau xuất bản, outbox gọi `/api/revalidate` của web với tag `content:handbook`.

## Hệ quả

- `content-service` có thêm env: `IDENTITY_SERVICE_URL`, `SERVICE_TOKEN_PRIVATE_JWK`, `WEB_APP_URL`, `REVALIDATE_SECRET`, `HANDBOOK_UPLOAD_DIR`; `identity-service` tin khoá của `content-service`; `content-service` tin khoá của `web` (`docs/06`).
- Production cần volume cho `HANDBOOK_UPLOAD_DIR` (`/var/lib/lavieco/handbook-uploads`), một instance `content-service` sở hữu thư mục đó.
- Ước lượng Cloudinary: một trang JPEG gốc ~0,4–1,2 MB; 48 trang ≈ 20–60 MB/phiên bản, tối đa 5 bộ giữ lại ≈ 100–300 MB (trang không đổi dùng chung nên thực tế ít hơn). Băng thông: trang đọc `lv_w960`/`lv_w1280` f_auto ~120–250 KB, thumbnail `lv_w160` ~8 KB; 1.000 lượt đọc 20 trang ≈ 3–5 GB/tháng. Vừa gói Free (25 credit/tháng) ở quy mô thí điểm; theo dõi trong dashboard Cloudinary.
- Ghi chú cá nhân của người đọc (UC-02 cũ) bỏ ở GĐ1; đánh dấu trang và trang đang đọc lưu trên thiết bị, GĐ2 đồng bộ qua `reader_states`.
- Không tải PDF về ở GĐ1.
