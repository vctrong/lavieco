# Cẩm nang Xanh số: xuất file để tải lên

Dành cho nhóm đồ hoạ. Mỗi trang sổ là một ảnh; web lấy **chữ** của trang (nếu có) để bạn đọc tìm kiếm, để Google hiểu trang và để LaviAgent trả lời. Xem thêm ADR-0029.

## Khổ trang

- **A5 dọc**: 148 × 210 mm (tỉ lệ 1 : 1,414). Lệch hơn 3% vẫn nhận nhưng admin sẽ cảnh báo (có thể có viền trắng khi đọc).
- Mỗi trang PDF là **một trang sổ**. Không ghép hai trang thành một trang đôi.
- Ảnh rời: **1748 × 2480 px** (A5 ở 300 dpi), PNG hoặc JPG, tối đa 25 MB/ảnh. Đặt tên theo thứ tự đọc: `01.png`, `02.png`, … (admin sắp theo tên).

## Bìa và chương

- **Bìa trước** và **bìa sau** xuất thành **file riêng** (một ảnh hoặc PDF một trang mỗi bìa), tải ở khung "Bìa sổ" trong admin. Không đặt bìa trong PDF nội dung: trang 1 của PDF là trang 1 của sổ (sau bìa).
- Lời mở đầu, mục lục in, phụ lục, tài liệu tham khảo: để trong PDF như trang thường, rồi trong admin tạo chương loại **Mở đầu** hoặc **Phụ lục** và chuyển các trang đó vào. Admin luôn xếp Mở đầu trước, Phụ lục sau cùng.

## Giữ chữ là chữ (quan trọng)

Chữ chỉ lấy được khi nó **còn là chữ** trong PDF:

- **Không** chọn "Convert text to outlines / Create outlines / Chuyển chữ thành nét".
- **Nhúng font** (Embed fonts), xuất màu **RGB**.
- **Không** đặt mật khẩu cho PDF.
- Chữ nằm trong ảnh (chụp, scan, chữ vẽ tay) sẽ không lấy được: trang đó hiện nhãn **"Thiếu chữ"**, hãy gõ lại chữ trong admin (ô "Chữ của trang").

| Công cụ | Cách xuất |
|---|---|
| Canva | Chia sẻ → Tải xuống → **PDF Chuẩn**. Không bật "Làm phẳng PDF". |
| Illustrator / InDesign | Save as / Export → Adobe PDF, preset **High Quality Print** hoặc **PDF/X-4**; không outline chữ. |
| Figma | Export → PDF từng frame A5 (chữ được giữ). |
| Affinity | Export → PDF (for export), không chọn "Rasterize". |

Kích thước PDF tối đa **200 MB**, tối đa **300 trang**. Ảnh nhúng nên ở 300 dpi; cao hơn chỉ làm file nặng.

## Cập nhật

- **Thay một trang**: trong admin, menu ⋮ của trang → "Thay trang", chọn ảnh hoặc PDF một trang. Địa chỉ trang, chữ gõ tay và điểm bấm được giữ.
- **Thay cả cuốn**: tải PDF mới, chọn "Thay cả cuốn". Trang thứ N giữ địa chỉ, chương và điểm bấm của trang thứ N cũ; trang không đổi nội dung sẽ không tải lại lên Cloudinary.
- Xong thì bấm **Xuất bản** và ghi chú ngắn ("Thay trang 12, thêm chương 5"). Cả nhóm nhận thông báo.
