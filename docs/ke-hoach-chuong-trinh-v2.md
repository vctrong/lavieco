# Kế hoạch nâng cấp Chương trình v2: vé, ưu đãi, khảo sát, email

> LAVIECO · admin + web + program-service · soạn ngày 02/11/2026, sau đợt chạy thử bán vé workshop.
> Gợi ý: đặt file này ở `docs/ke-hoach-chuong-trinh-v2.md` để Claude Code đọc khi cần. Mỗi PR có một prompt riêng ở cuối mục của PR đó.

---

## 0. Những gì đã chốt

| Chủ đề | Quyết định |
| --- | --- |
| Vé nhiều người | **A. Vé combo**: 1 suất = N người, phát N vé và N QR. **B. Chia sẻ từng vé** cho người đi cùng. |
| Voucher | **C. Mã giảm giá**, có 2 phạm vi: **theo sự kiện** và **toàn app**. Toàn app có thêm điều kiện cho khách thân thiết, khách mua nhiều đơn, khách mới, danh sách riêng. Có "voucher săn" (công khai, ít lượt, ai nhanh thì được). |
| Khảo sát | 2 loại: **khảo sát độc lập** (cho đồ án, nghiên cứu) và **feedback sự kiện** (gắn với chương trình và vé). |
| Xem trước | Bấm "Xem trước" sẽ mở **tab mới, toàn màn hình, giống trang thật**, có một thanh nhỏ báo đang ở chế độ xem trước. Bỏ trang iframe cũ. |
| Poster | Bỏ khung vòm cho ảnh tải lên. Poster dùng **4:5 hoặc 1:1, bo góc**, admin tự chọn. Có bước cắt ảnh. |
| Banner | Sự kiện không có banner thì hero dùng **ảnh banner mặc định**, không cắt poster nữa. |
| Danh sách admin | Hiện ảnh poster thu nhỏ ở mỗi dòng. |
| Email hàng loạt | Có chiến dịch email: thư cảm ơn, mời feedback, thông báo. Có thể **tự động gửi sau khi sự kiện kết thúc**. |

## 1. Thứ tự làm

| PR | Nội dung | Phụ thuộc | Độ lớn |
| --- | --- | --- | --- |
| **PR1** | Poster 4:5/1:1 + cắt ảnh, banner mặc định, ảnh thu nhỏ ở danh sách admin | — | Nhỏ |
| **PR2** | Xem trước ở tab mới + làm gọn trang sửa chương trình | — | Nhỏ–vừa |
| **PR3** | Vé combo + sức chứa chung + chia sẻ từng vé | — | Vừa |
| **PR4** | Voucher theo sự kiện và toàn app | PR3 (cách tính giá) | Lớn |
| **PR5** | Khảo sát: độc lập + feedback sự kiện | PR3 (link theo từng vé) | Lớn |
| **PR6** | Email hàng loạt + tự gửi sau sự kiện | PR5 (link khảo sát) | Lớn |

PR1 và PR2 làm độc lập được, nên làm trước để có thứ dùng liền.

**Cách làm với Claude Code:** mỗi PR mở một phiên mới. Dán **Prompt chung** (mục 2) trước, rồi dán prompt của PR đó. Bật plan mode, duyệt kế hoạch xong mới cho code.

---

## 2. Prompt chung (dán đầu mỗi phiên)

```text
Bối cảnh: repo LAVIECO (monorepo). Đọc CLAUDE.md trước. File kế hoạch tổng nằm ở
docs/ke-hoach-chuong-trinh-v2.md. Chỉ đọc mục 0 và mục của PR được giao.

Quy trình bắt buộc:
1. Khảo sát code liên quan trước khi đề xuất: program-service (events, ticketing,
   orders, checkin, payments, outbox, registrations), packages/shared/src/events và media,
   apps/admin/src/features/events, apps/web/src/features/events. Đọc docs/05-programs-module.md
   và các phần liên quan của docs/01, 03, 04.
2. Gửi tôi kế hoạch trước khi code, gồm: file sẽ thêm/sửa, thay đổi zod schema, collection,
   index và migration, endpoint (admin, public, BFF), màn hình admin và web, quyền
   (permission) mới, test sẽ viết. Tài liệu mâu thuẫn với code hay với kế hoạch này thì
   DỪNG và hỏi tôi.
3. Khi code:
   - Zod trong packages/shared là nguồn sự thật, viết schema trước.
   - Logic nghiệp vụ nằm ở service (domain thuần + application). Kiểm tra quyền ở service.
   - Việc bất đồng bộ (email, audit, làm mới cache) đi qua outbox trong cùng giao dịch.
   - Text UI đặt trong constants, không hardcode. Không viết hex inline. Icon dùng react-icons/fi.
   - Giữ BR-13: chỉ thu thông tin người đặt. Không thêm dữ liệu cá nhân khi kế hoạch không yêu cầu.
   - Cập nhật tài liệu: docs/03 (collection/trường/index), docs/05 (luồng), docs/01 (BR/UC mới),
     ADR mới nếu có quyết định kiến trúc, docs/06 nếu thêm biến môi trường.
   - Test: domain unit test + test tích hợp cho endpoint chính + snapshot email nếu đổi email.
   - Chạy lint, typecheck, test có --filter cho các package bị đổi.
4. Làm trên nhánh feat/<tên-ngắn>. Commit theo commitlint. Mở PR có mô tả, checklist
   và ảnh chụp màn hình admin + web (desktop và mobile).
```

---

## 3. PR1: Poster, banner mặc định, ảnh thu nhỏ ở danh sách

### Hiện trạng (đã kiểm tra trong code)
- Ô tải poster trong admin dùng `rounded-arch-sm` (khung vòm) trong `image-fields.tsx`.
- Thẻ sự kiện ngoài web đã là `aspect-[4/5] rounded-2xl`.
- Hero trang chi tiết dùng `banner ?? cover`, rồi cắt về 16:9 hoặc 21:9 trên màn hình lớn. Kết quả là poster bị cắt mất phần lớn khi sự kiện không có banner.
- Danh sách `/events` của admin: API đã trả về `cover`, nhưng giao diện vẫn hiện icon `FiImage`.

### Thiết kế
- Thêm trường `posterRatio: "4:5" | "1:1"` cho event, mặc định `"4:5"`. Migration gán mặc định cho dữ liệu cũ.
- **Cắt ảnh khi tải lên:**
  - Chọn tỉ lệ 4:5 hoặc 1:1, kéo và zoom để cắt.
  - Ưu tiên cắt **không phá ảnh gốc**: lưu toạ độ cắt rồi để Cloudinary cắt lúc trả ảnh (xem `packages/shared/src/media/delivery.ts`), để sau này cắt lại được.
  - Không làm được kiểu đó thì cắt ở client trước khi tải lên. Nêu rõ trong kế hoạch là chọn cách nào.
- **Bo góc thống nhất:**
  - Ảnh người dùng tải lên dùng `rounded-2xl` (thumbnail nhỏ dùng `rounded-xl`).
  - `ArchFrame` và `rounded-arch-*` chỉ giữ cho phần trang trí của landing page.
- **Thẻ web:**
  - Khung thẻ giữ cố định 4:5 để lưới đều nhau.
  - Poster 1:1 hiện trọn ảnh (contain), nền phía sau là chính ảnh đó làm mờ (blur).
- **Hero trang chi tiết:**
  - Dùng `banner ?? ảnh banner mặc định`. Ảnh mặc định đặt ở `apps/web/public/images/placeholders/event-banner-default.webp`, mang họa tiết brand, team thiết kế có thể thay sau.
  - **Không bao giờ dùng poster làm hero.**
  - Poster hiện ở cột thông tin hoặc khu vé, đúng tỉ lệ đã chọn.
- **Poster mặc định** khi chưa có poster: một placeholder theo brand.
- **Admin danh sách:**
  - Ảnh thu nhỏ poster rộng khoảng 56px, đúng tỉ lệ, bo góc, ảnh nhỏ từ Cloudinary.
  - Chưa có poster thì hiện icon như hiện tại.
- Ảnh chia sẻ (OG image): banner, không có thì poster, không có nữa thì ảnh mặc định.

### Xong khi
- Tạo được sự kiện với poster 4:5 và poster 1:1. Cả hai hiện đúng ở danh sách admin, thẻ web và trang chi tiết.
- Sự kiện không có banner: hero dùng ảnh mặc định, poster không bị cắt.

### Prompt PR1
```text
Làm PR1 trong docs/ke-hoach-chuong-trinh-v2.md (mục 3).

Yêu cầu:
- Thêm event.posterRatio ("4:5" | "1:1", mặc định "4:5"): zod shared, model, migration,
  mapper, form admin.
- Ô tải poster trong admin (image-fields.tsx): bỏ rounded-arch-*, thêm bước cắt ảnh có
  chọn tỉ lệ 4:5/1:1. Ưu tiên cắt không phá ảnh gốc qua Cloudinary transformation; trình
  bày phương án trong kế hoạch trước khi code. Kiểm tra dependency đang có trước khi thêm
  thư viện cắt ảnh.
- Ảnh người dùng tải lên ở admin và web dùng bo góc chữ nhật. Giữ ArchFrame cho landing.
- Danh sách /events trong admin: hiện thumbnail cover (đã có trong EventListItem), fallback icon.
- Web:
  - Thẻ sự kiện giữ khung 4:5; poster 1:1 hiện contain trên nền blur của chính ảnh.
  - Hero trang chi tiết dùng banner ?? ảnh mặc định ở
    public/images/placeholders/event-banner-default.webp (tạo ảnh tạm theo brand, ghi chú để
    designer thay). Không dùng cover làm hero nữa.
  - Hiện poster ở khu thông tin hoặc khu vé.
  - Có placeholder cho poster bị thiếu.
  - OG image fallback banner → cover → mặc định.
  - Trang xem trước (/xem-truoc/...) cũng phải đúng như vậy.
- Cập nhật docs/03 và docs/05. Viết test cho mapper/domain liên quan.
```

---

## 4. PR2: Xem trước ở tab mới + làm gọn trang sửa

### Hiện trạng
- `/events/[id]/preview` trong admin là một trang có iframe, token sống 10 phút, phải lưu rồi mới thấy.
- Trang sửa có 3 khối (Thông tin, Loại vé, Form), mỗi khối lưu riêng, cột phải là bảng trạng thái.

### Thiết kế: xem trước
- Nút **"Xem trước"** mở `target="_blank"`. Nút có ở thanh trên của trang sửa và ở menu nhanh mỗi dòng trong danh sách.
- `/events/[id]/preview` của admin chuyển thành **Route Handler**:
  - Kiểm tra quyền `program:read`.
  - Tạo token mới.
  - Chuyển hướng 302 sang trang web `/xem-truoc/chuong-trinh/[token]`.
  - Mỗi lần bấm là một token mới, nên không còn lỗi hết hạn.
- **Trang xem trước trên web** dùng đúng layout của trang thật và hiện toàn màn hình. Thêm một **thanh nổi nhỏ** ở trên cùng:
  - Nội dung: `BẢN XEM TRƯỚC · Chưa công khai · <trạng thái>`, nút **Làm mới** (quay lại URL redirect của admin để lấy token mới), nút **Thu gọn**.
  - Có thể thêm liên kết chuyển giữa *Trang chi tiết* · *Thẻ trong danh sách* · *Email vé* (nice-to-have).
  - Nút mua/đăng ký bị vô hiệu, bấm vào thì báo "Đang ở chế độ xem trước".
  - Gắn `noindex` và `no-store`.
- Bấm "Xem trước" khi còn thay đổi chưa lưu thì hỏi: **"Lưu rồi xem"** / **"Xem bản đã lưu"**.
- Xoá trang iframe cũ và text không còn dùng.

### Thiết kế: làm gọn trang sửa (đề xuất, làm luôn trong PR này)
- **Thanh trên cố định:** tên chương trình, badge trạng thái, chỉ báo "Đã lưu / Có thay đổi chưa lưu (khối nào)", nút Xem trước, nút hành động chính (Gửi duyệt/Xuất bản).
- **Menu mục bên trái** (neo cuộn): Thông tin · Hình ảnh · Vé & giá · Form đăng ký · (sau này: Mã giảm giá · Khảo sát · Email). Mỗi mục có ✓ hoặc ⚠ lấy từ `publish-readiness`.
- Rời trang khi còn thay đổi chưa lưu thì cảnh báo.
- Trạng thái, cảnh báo và thông báo lỗi dùng chung một kiểu hiển thị (toast/banner), không mỗi khối một kiểu.

### Xong khi
- Bấm Xem trước mở tab mới đúng giao diện thật. Để quá 10 phút rồi bấm Làm mới vẫn xem được.
- Trang sửa luôn cho biết khối nào chưa lưu và mục nào còn thiếu để xuất bản.

### Prompt PR2
```text
Làm PR2 trong docs/ke-hoach-chuong-trinh-v2.md (mục 4).

Yêu cầu:
- Đổi apps/admin /events/[id]/preview thành Route Handler: kiểm tra quyền, tạo preview
  token qua program-service, redirect 302 sang web /xem-truoc/chuong-trinh/[token]. Bỏ
  EventPreviewPage dạng iframe.
- Mọi nút "Xem trước" (trang sửa, menu nhanh ở danh sách) mở tab mới. Còn thay đổi chưa
  lưu thì hỏi "Lưu rồi xem" / "Xem bản đã lưu".
- Web /xem-truoc/chuong-trinh/[token]:
  - Hiện toàn màn hình như trang thật, thêm thanh nổi "Bản xem trước" (trạng thái, Làm mới
    = quay lại URL redirect của admin, Thu gọn).
  - Vô hiệu nút mua/đăng ký, gắn noindex và no-store.
  - Token hết hạn thì hiện màn hướng dẫn bấm Làm mới, không hiện lỗi thô.
- Trang sửa:
  - Thanh trên cố định (tên, trạng thái, chỉ báo khối chưa lưu, Xem trước, hành động chính).
  - Menu mục bên trái có dấu ✓/⚠ lấy từ publish-readiness.
  - Cảnh báo khi rời trang mà chưa lưu.
  - Không đổi cách lưu từng khối nếu chưa hỏi tôi.
- Cập nhật docs/05 (D2 preview). Test: route handler (quyền, redirect), e2e mở xem trước nếu
  bộ e2e hiện có làm được.
```

---

## 5. PR3: Vé combo + sức chứa chung + chia sẻ từng vé

### Hiện trạng
- Mỗi vé (`tickets`) đã có QR riêng. Mua 2 vé thường đã ra 2 QR.
- "Vé đôi" hiện là một loại vé đơn nên chỉ có 1 QR.
- Sức chứa đang tính riêng theo từng loại vé, chưa có tổng sức chứa cho cả sự kiện.

### Thiết kế
- **Loại vé thêm `seatsPerUnit`** (1–10, mặc định 1). Ví dụ "Combo 2 người", giá 180.000đ, `seatsPerUnit = 2`.
  - Mua 1 suất thì phát 2 `tickets`. Mỗi vé có QR riêng, kèm `unitIndex` và `seatIndex` để hiển thị kiểu "Combo 2 người · suất 1 · vé 2/2".
  - `ticketsPerOrderMax` (20) **tính theo số người**.
  - Trên web hiện "Combo 2 người · 90.000đ/người".
- **Sức chứa chung (tuỳ chọn) `event.capacity`:** tổng số người tối đa của sự kiện. Mọi loại vé (đơn và combo) cùng trừ vào đó theo số người. Mỗi loại vé vẫn có `quantity` riêng. Giữ chỗ và bán chỗ phải nguyên tử ở cả hai mức.
- "Còn X chỗ" và "Sắp hết chỗ" tính theo số người.
- **Chia sẻ từng vé:**
  - Mỗi vé có link riêng `/ve/v/[ticketToken]` (token ký HMAC, hạn dài). Link chỉ hiện QR của vé đó và thông tin sự kiện, **không có dữ liệu người đặt**.
  - Trang đơn `/ve/[token]` có nút "Chia sẻ vé này" ở mỗi vé: Web Share API, sao chép link, mở Zalo.
  - Email vé có link chia sẻ ở từng vé.
  - Admin có nút **"Cấp lại QR"** cho một vé (thu hồi QR cũ khi lỡ chia nhầm), có audit.
- Màn check-in hiện loại vé, "vé x/y" của combo, và vé đã dùng hay chưa.
- File Excel đăng ký thêm cột số người, combo.

### Xong khi
- Bán 1 combo 2 người: ra 2 QR, check-in 2 lần độc lập được, sức chứa trừ 2.
- Người đi cùng mở link chia sẻ, thấy đúng 1 QR, không thấy email hay SĐT của người mua.

### Prompt PR3
```text
Làm PR3 trong docs/ke-hoach-chuong-trinh-v2.md (mục 5).

Yêu cầu:
- ticket_types.seatsPerUnit (1..10, mặc định 1):
  - Zod shared, model, migration, form admin (giải thích ngắn "1 suất = N người").
  - priceOrder tính theo suất; số vé phát ra = quantity × seatsPerUnit.
  - ticketsPerOrderMax tính theo số người.
  - Khoá sửa seatsPerUnit khi đã có chỗ bị giữ hoặc đã bán (giống khoá giá).
- event.capacity (tuỳ chọn, null = không giới hạn chung):
  - Giữ chỗ, bán, nhả chỗ phải nguyên tử ở cả mức loại vé và mức sự kiện.
  - Sửa availabilityOf/seatsOf/isFewSeats theo số người.
  - Test đồng thời (2 đơn tranh chỗ cuối).
- tickets thêm unitIndex/seatIndex. Email vé, trang /ve/[token], màn check-in, Excel hiện
  "Combo N người · vé x/y".
- Chia sẻ từng vé:
  - Token HMAC riêng cho từng vé, trang web /ve/v/[ticketToken] chỉ có QR + thông tin sự
    kiện, không có dữ liệu người đặt (BR-13).
  - Nút chia sẻ (Web Share, copy, Zalo) trên trang đơn và trong email.
- Admin "Cấp lại QR" cho một vé: đổi qrToken, vô hiệu QR cũ, có audit, gửi lại email cho
  người đặt (tuỳ chọn trong dialog).
- Đảm bảo HTML email 20 vé vẫn < 90 KB (test đang có). Cập nhật docs/03, docs/05, BR liên
  quan trong docs/01.
```

---

## 6. PR4: Voucher theo sự kiện + toàn app

### Mô hình
Collection `vouchers` (DB của program-service):

| Nhóm | Trường |
| --- | --- |
| Định danh | `code` (viết hoa, duy nhất), `name`, `description`, `status` (`active` / `paused` / `archived`) |
| Phạm vi | `scope`: `event` (kèm `eventId`, tuỳ chọn `ticketTypeIds[]`) · `global` (mọi sự kiện, tuỳ chọn loại trừ sự kiện, tuỳ chọn chỉ áp dụng cho loại sự kiện `eventTypeIds[]`) |
| Mức giảm | `discountType`: `percent` · `fixed`; `value`; `maxDiscount` (trần cho %) |
| Điều kiện đơn | `minSeats` (ví dụ từ 2 người), `minSubtotal` |
| Ai được dùng | `eligibility`: `everyone` · `members` (đã đăng nhập) · `loyal` (đã có ≥ `minPaidOrders` đơn đã thanh toán) · `new_customer` (chưa có đơn nào đã thanh toán) · `allowlist` (danh sách email) |
| Giới hạn | `totalUses` (null = không giới hạn), `perCustomer` (mặc định 1), `startAt`, `endAt` |
| Hiển thị | `visibility`: `public` (hiện trên trang sự kiện hoặc khu "Ưu đãi" để săn, có "còn X lượt" và đếm ngược) · `private` (phải biết mã) |
| Bộ đếm | `used`, `held`, `revision` |

Collection `voucher_redemptions`: `voucherId`, `orderId`, `customerKey` (userId, không có thì emailNormalized), `state` (`held` / `redeemed` / `released`), mốc thời gian. Có unique index để chặn dùng quá `perCustomer`.

### Quy tắc
- **Mỗi đơn 1 mã**, không cộng dồn. Giảm giá tính trên tạm tính, sau khi đã tính combo. Tiền giảm không vượt tạm tính.
- **Tính giá ở server:** `priceOrder` trả về `subtotal`, `discount`, `amount`. Đơn lưu snapshot `discount: { voucherId, code, amount }`.
- **Vòng đời lượt dùng giống ghế:**
  - Đơn tạo ra thì `held`. Thanh toán thì `redeemed`. Hết hạn hoặc huỷ thì `released`.
  - Tăng bộ đếm bằng phép cập nhật có điều kiện (`used + held < totalUses`) để voucher săn không bị vượt lượt.
- **Khách thân thiết và khách mới:** xác định qua email đã xác minh ở checkout (email proof) hoặc `userId`. Đếm đơn đã thanh toán trong DB program.
- **Hoàn tiền:** mặc định không trả lại lượt dùng (ghi rõ thành BR).
- Sau giảm còn 0đ thì đi luồng đơn 0đ. Nếu payOS có số tiền tối thiểu thì kiểm tra và báo lỗi rõ ràng.
- **Chống dò mã:** endpoint kiểm tra mã có giới hạn tần suất theo IP và email. Thông báo lỗi chung chung, không tiết lộ mã có tồn tại hay không.

### Admin
- Menu mới **"Ưu đãi"**: danh sách (lọc theo phạm vi, trạng thái), tạo và sửa, nhân bản, tạm dừng. Xem thống kê: lượt dùng, tổng tiền đã giảm, doanh thu các đơn có dùng mã.
- Trong trang sửa sự kiện có mục **"Mã giảm giá"**: các mã của sự kiện đó và các mã toàn app đang áp dụng được.
- Danh sách đơn, chi tiết đơn và Excel có cột mã và tiền giảm.
- Permission mới `voucher:write` (Super Admin, Coordinator), có audit.

### Web
- Checkout:
  - Ô "Mã ưu đãi" + nút **Áp dụng**, hiện tiền giảm ngay, cho phép gỡ mã.
  - Nút **"Chọn ưu đãi"** liệt kê các mã công khai còn lượt.
- Trang sự kiện: dải "Ưu đãi đang có" cho voucher công khai, kèm "còn X lượt" và đếm ngược.
- Email vé và trang đơn hiện tạm tính, giảm giá, tổng tiền.
- (Để sau) Trang "Ưu đãi của tôi" cho thành viên: mã trong allowlist, mã dành cho khách thân thiết.

### Xong khi
- Mã sự kiện "GIAM2NGUOI" (từ 2 người, giảm 10%) và mã toàn app "THANTHIET" (≥ 2 đơn đã thanh toán, giảm 20k) chạy đúng.
- Voucher săn 5 lượt bị 10 người cùng dùng: đúng 5 đơn giữ được mã.
- Đơn hết hạn thì lượt được trả lại.

### Prompt PR4
```text
Làm PR4 trong docs/ke-hoach-chuong-trinh-v2.md (mục 6). PR3 đã merge.

Yêu cầu:
- Module mới vouchers trong program-service (domain/application/infrastructure/api theo
  docs/04), collections vouchers + voucher_redemptions đúng như bảng trong kế hoạch, index
  và migration.
- Tích hợp vào checkout:
  - priceOrder trả subtotal/discount/amount; order lưu snapshot discount.
  - Lượt dùng đi theo vòng đời held → redeemed / released cùng giao dịch với ghế (expiry,
    cancel, webhook payOS, đơn 0đ).
  - Tăng bộ đếm nguyên tử có điều kiện. Test đồng thời cho voucher săn.
- Điều kiện eligibility: everyone, members, loyal (minPaidOrders), new_customer, allowlist.
  Xác định khách qua email đã xác minh hoặc userId.
- Một mã mỗi đơn. Hoàn tiền không trả lượt (thêm BR vào docs/01). Kiểm tra số tiền tối
  thiểu của payOS.
- Public endpoint kiểm tra mã: giới hạn tần suất, thông báo lỗi chung chung. Endpoint liệt
  kê voucher public của một sự kiện.
- Admin:
  - Trang "Ưu đãi" (CRUD, nhân bản, tạm dừng, thống kê).
  - Mục "Mã giảm giá" trong trang sửa sự kiện.
  - Cột mã/giảm giá ở đơn và Excel.
  - Permission voucher:write + audit.
- Web: ô nhập mã + "Chọn ưu đãi" ở checkout, dải "Ưu đãi đang có" trên trang sự kiện (còn X
  lượt, đếm ngược), email vé và trang đơn hiện dòng giảm giá.
- Cập nhật docs/01, 03, 05. Viết ADR nếu thêm module có quyết định kiến trúc mới.
```

---

## 7. PR5: Khảo sát (độc lập + feedback sự kiện)

### Đặt ở đâu
Module `surveys` trong **program-service**. Lý do: dùng lại được domain form (`FormQuestion`, `validateAnswers`), token vé, bộ ghi Excel và hạ tầng email. Ghi lý do này trong một ADR ngắn. Nếu Claude Code thấy nên đặt ở `lead-service` thì phải nêu lý do và hỏi trước.

### Mô hình
- `surveys`:
  - `kind`: `standalone` · `event_feedback` (kèm `eventId`)
  - `slug`, `title`, `intro`, ảnh bìa (tuỳ chọn), `thankYouMessage`
  - `questions[]`: dùng lại `FormQuestion` và thêm 2 loại **`rating`** (1–5 sao) và **`scale`** (0–10/NPS, nhãn hai đầu); thêm khối **tiêu đề phần** để chia nhóm câu hỏi
  - `settings`:
    - `anonymous`
    - `collectEmail` / `collectName` (tuỳ chọn hoặc bắt buộc, chỉ khi không ẩn danh)
    - `access`: `public_link` · `ticket_holders`
    - `onePer`: `ticket` · `email` · `browser`
    - `opensAt`, `closesAt`, `maxResponses`, `consentText`
  - `status` (`draft` / `open` / `closed`), `revision`
- `survey_responses`:
  - `surveyId`, `answers`, `submittedAt`
  - Liên kết tuỳ chọn: `ticketId` hoặc `orderId`. Khảo sát ẩn danh chỉ lưu hash để chặn trả lời trùng, không lưu liên kết.
  - Email và tên nếu có thu.
- **Mẫu có sẵn "Feedback workshop"** gồm: mức hài lòng chung (sao), NPS, điều thích nhất, điều cần cải thiện, có muốn tham gia lần sau, góp ý tự do.

### Admin
- Menu **"Khảo sát"**: danh sách (lọc theo loại, trạng thái), tạo từ mẫu hoặc tạo trống, nhân bản, mở và đóng.
- Builder dùng lại `form-builder.tsx` và thêm loại câu hỏi mới.
- **Trang kết quả:**
  - Tóm tắt từng câu: biểu đồ cột cho câu chọn, điểm trung bình cho sao và thang điểm, phân bổ NPS, danh sách câu trả lời văn bản.
  - Bảng từng phản hồi.
  - Xuất Excel và CSV.
- **Chia sẻ:** copy link, tải **mã QR** (PNG + bản A4 để in hoặc chiếu cuối buổi).
- Trong trang sửa sự kiện có mục **"Khảo sát feedback"**: tạo nhanh từ mẫu, xem số phản hồi trên số người đã check-in.
- Permission `survey:write`, `survey:read`.

### Web cho user
- Trang `/khao-sat/[slug]` (feedback theo vé là `/khao-sat/[slug]?t=<ticketToken>`):
  - Giao diện brand, ưu tiên mobile, có thanh tiến độ, nút sao và thang điểm dễ bấm.
  - Tự lưu nháp trong trình duyệt.
  - Màn cảm ơn có CTA quay lại trang chương trình hoặc LaviAgent.
- Các trạng thái: chưa mở, đã đóng, đã trả lời rồi, link không hợp lệ. Mỗi trạng thái có thông báo dễ hiểu.
- **Điểm vào của feedback sự kiện:**
  - Nút "Gửi cảm nhận" trên `/ve/[token]` và `/ve/v/[ticketToken]` sau khi sự kiện kết thúc.
  - Email mời feedback (PR6).
  - QR chiếu cuối buổi (`public_link`, chặn trùng theo trình duyệt).
- **Chống spam:** giới hạn tần suất, ô bẫy honeypot. Dùng lại cơ chế chống bot đang có nếu có.

### Xong khi
- Tạo khảo sát đồ án công khai, thu được phản hồi, xuất Excel được.
- Feedback workshop: mỗi vé trả lời được 1 lần qua link. Trang kết quả hiện điểm trung bình và NPS.

### Prompt PR5
```text
Làm PR5 trong docs/ke-hoach-chuong-trinh-v2.md (mục 7). PR3 đã merge.

Yêu cầu:
- Module surveys trong program-service (nếu thấy nên đặt chỗ khác thì hỏi trước). Viết
  ADR ngắn về vị trí module.
- Collections surveys + survey_responses theo kế hoạch.
- Dùng lại FormQuestion/validateAnswers. Thêm loại câu rating (1–5), scale (0–10, nhãn hai
  đầu), khối tiêu đề phần. Cập nhật zod shared và form-builder dùng chung cho cả form đăng
  ký và khảo sát.
- Hai loại: standalone và event_feedback. Settings: anonymous, collectEmail/Name, access
  (public_link | ticket_holders), onePer (ticket | email | browser), mở/đóng, maxResponses,
  consent. Khảo sát ẩn danh không lưu liên kết tới vé/email, chỉ lưu hash chống trùng.
- Mẫu "Feedback workshop" dựng sẵn.
- Admin:
  - Danh sách, builder, nhân bản, mở/đóng.
  - Trang kết quả (tóm tắt từng câu, bảng phản hồi, Excel/CSV qua excel-workbook-writer).
  - Tải QR PNG + bản A4.
  - Mục "Khảo sát feedback" trong trang sửa sự kiện.
  - Permission survey:read/write + audit.
- Web:
  - /khao-sat/[slug] (và ?t=ticketToken) mobile-first, thanh tiến độ, lưu nháp ở trình
    duyệt, màn cảm ơn, đủ các trạng thái lỗi.
  - Nút "Gửi cảm nhận" trên trang vé sau khi sự kiện kết thúc.
  - Rate limit + honeypot.
- Cập nhật docs/01 (UC/BR mới), 03, 05. Test domain (validate từng loại câu, chống trùng)
  và tích hợp (submit, export).
```

---

## 8. PR6: Email hàng loạt + tự động sau sự kiện

### Ràng buộc quan trọng (đã kiểm tra trong code)
- Mail đi qua **Brevo, giới hạn 300 email/ngày**, rồi tới Gmail dự phòng (ADR-0023).
- Số đó dùng chung với OTP và email vé, nên chiến dịch **phải có hạn mức riêng** và gửi giãn ra theo hàng đợi. Không được ăn hết hạn mức của OTP và email vé.

### Mô hình
- `campaigns`:
  - `name`, `type` (`thank_you` · `feedback_invite` · `announcement` · `custom`)
  - `audience` (bộ lọc đã lưu), `subject`, `preheader`, `body` (markdown hoặc khối nội dung đơn giản), `cta { label, url | biến }`
  - `surveyId` (tuỳ chọn), `scheduledAt`
  - `status` (`draft` / `scheduled` / `sending` / `paused` / `done` / `cancelled`), bộ đếm
- `campaign_recipients`:
  - `campaignId`, `email`, `name`, `ticketId` / `orderId` (để sinh link riêng)
  - `status` (`queued` / `sent` / `failed` / `skipped`), `error`, `sentAt`
  - Unique index `(campaignId, email)`
- `email_suppressions`: các email đã hủy nhận, kèm lý do và mốc thời gian.

### Tệp người nhận
- Theo sự kiện: người đặt có đơn đã thanh toán. Lọc thêm được: **đã check-in / chưa check-in**, theo loại vé.
- Tất cả khách đã từng mua (có thể lọc theo khoảng thời gian, số đơn).
- Người trả lời khảo sát có để lại email.
- Danh sách nhập tay hoặc tải CSV.
- (Tuỳ chọn) thành viên, cần gọi API của identity-service qua api-clients.
- Hệ thống tự gộp trùng và loại email đã hủy nhận. **Xem trước số người nhận và vài ví dụ** trước khi gửi.

### Nội dung
- Mẫu có sẵn: *Cảm ơn bạn đã tham gia*, *Mời chia sẻ cảm nhận*, *Thông báo / nhắc lịch*.
- **Biến:**
  - `{{ten}}`, `{{chuong_trinh}}`, `{{ngay}}`
  - `{{link_khao_sat}}`: link riêng từng người theo vé. Đơn nhiều vé thì gửi một link cho mỗi vé, kèm câu "chuyển cho người đi cùng".
  - `{{link_ve}}`
- Dùng **layout email chung** đang có trong service-kit.
- Có **xem trước** và **gửi thử cho tôi**. `mail:preview` có thêm các mẫu chiến dịch.
- **Hủy nhận:** footer có link một chạm và header `List-Unsubscribe`.

### Gửi
- Gửi ngay hoặc hẹn giờ.
- Worker lấy mail từ hàng đợi, gửi giãn ra (`CAMPAIGN_RATE_PER_MINUTE`), và tôn trọng **hạn mức ngày cho chiến dịch** (`CAMPAIGN_DAILY_LIMIT`, mặc định 150).
- Vượt hạn mức thì tự gửi tiếp vào hôm sau. Giao diện báo ước tính kiểu "sẽ gửi xong trong khoảng 2 ngày".
- Có tạm dừng, tiếp tục, huỷ, và gửi lại các email lỗi.
- **An toàn khi gửi:**
  - Permission `campaign:send`.
  - Bắt **xác thực lại 2FA (step-up, ADR-0021)** trước khi gửi.
  - Hộp xác nhận bắt gõ lại số người nhận.
  - Audit đầy đủ.

### Tự động sau sự kiện
- Trong trang sửa sự kiện có mục **"Sau sự kiện"**: bật "Tự gửi thư cảm ơn + mời feedback", chọn gửi sau X giờ kể từ khi kết thúc, chọn đối tượng (đã check-in hoặc tất cả người mua), chọn khảo sát.
- Đến giờ, hệ thống tạo chiến dịch. Chế độ mặc định là **tạo nháp và báo admin duyệt**; có tuỳ chọn gửi luôn.

### Xong khi
- Gửi thư cảm ơn kèm link feedback riêng từng vé cho người đã check-in của một workshop.
- Có trên 150 người nhận thì phần còn lại tự gửi vào hôm sau. Email OTP và email vé vẫn gửi bình thường trong lúc đó.
- Người đã hủy nhận không nhận chiến dịch tiếp theo.

### Prompt PR6
```text
Làm PR6 trong docs/ke-hoach-chuong-trinh-v2.md (mục 8). PR5 đã merge.

Yêu cầu:
- Module campaigns trong program-service: collections campaigns, campaign_recipients,
  email_suppressions theo kế hoạch.
- Audience builder:
  - Theo sự kiện (đơn đã thanh toán, lọc check-in/chưa, theo loại vé), mọi khách đã mua,
    người trả lời khảo sát có email, danh sách dán tay/CSV.
  - Gộp trùng, loại email đã hủy nhận, xem trước số người nhận + mẫu.
- Mẫu email thank_you / feedback_invite / announcement / custom, dùng layout chung trong
  service-kit.
  - Biến {{ten}} {{chuong_trinh}} {{ngay}} {{link_ve}} {{link_khao_sat}} (link riêng từng vé,
    đơn nhiều vé thì liệt kê từng link).
  - Gửi thử, xem trước, thêm vào mail:preview.
  - Footer hủy nhận + header List-Unsubscribe, trang web xác nhận hủy nhận.
- Gửi:
  - Hàng đợi + worker gửi giãn ra (dùng cơ chế scheduler/outbox đang có, không thêm
    broker).
  - Biến môi trường CAMPAIGN_DAILY_LIMIT (mặc định 150) và CAMPAIGN_RATE_PER_MINUTE (cập
    nhật env schema, .env.example, docs/06). Không được làm ảnh hưởng email OTP và email vé
    (Brevo 300/ngày, ADR-0023).
  - Hẹn giờ, tạm dừng, tiếp tục, huỷ, gửi lại email lỗi, trạng thái từng người nhận.
- An toàn: permission campaign:send, step-up 2FA (ADR-0021) trước khi gửi, xác nhận bằng
  cách gõ số người nhận, audit.
- Tự động sau sự kiện: cấu hình trên event (bật/tắt, X giờ sau khi kết thúc, đối tượng,
  khảo sát). Scheduler tạo campaign nháp và báo admin duyệt; có tuỳ chọn gửi luôn.
- Admin: menu "Email", danh sách chiến dịch, trình soạn có xem trước, màn theo dõi tiến
  độ. Mục "Sau sự kiện" trong trang sửa sự kiện.
- Cập nhật docs/01, 02 (luồng gửi hàng loạt), 03, 05, 06. Viết ADR về hàng đợi và hạn mức
  gửi. Test: audience (gộp trùng/hủy nhận), worker (hạn mức, gửi tiếp hôm sau, lỗi thì thử
  lại), snapshot email.
```

---

## 9. Việc để sau (chưa làm trong đợt này)
- Trang "Ưu đãi của tôi" cho thành viên, và tự tặng voucher sau khi khách trả lời feedback.
- Theo dõi tỉ lệ mở và tỉ lệ bấm của email (cần thêm pixel, cân nhắc quyền riêng tư).
- Xem trước ngay cả những thay đổi chưa lưu.
- Gửi lịch sự kiện `.ics` trong email vé (đã có `TODO(phase-6)`).
