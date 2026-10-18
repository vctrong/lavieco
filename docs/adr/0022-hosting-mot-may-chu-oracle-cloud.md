# ADR-022: Hosting GĐ1 trên một máy chủ Oracle Cloud Singapore (chốt AQ1)

| | |
|---|---|
| **Trạng thái** | Đề xuất (Proposed). Chờ đội duyệt |
| **Ngày** | 18/10/2026 |
| **Người đề xuất** | V.C. Trọng |
| **Liên quan** | `docs/02` §3.3 (P4), §12.2 (ADR-006), §12.3, §12.4, §15 (AQ1, AQ4, AQ6, AQ7); `docs/03` §10.3; ADR-018, ADR-020; `docs/runbooks/deploy-oracle.md` |

## Bối cảnh

`docs/02` §12.2 so sánh ba phương án hosting và khuyến nghị **B: một máy chủ + Docker Compose + Cloudflare**. Lý do chính là nguyên tắc **P4**: service không được mở ra Internet. Mục AQ1 (chốt phương án và ngân sách) vẫn đang mở.

Đã khảo sát thêm phương án A, đưa `web`/`admin` lên Vercel (`docs/DEPLOY_AUDIT.md`, bản khảo sát chưa commit). Kết quả:

- Ba service NestJS chạy liên tục và có worker nền bằng `setInterval`: outbox mỗi 1 giây, hết hạn giữ chỗ mỗi 60 giây (BR-14), dọn ảnh mỗi 15 phút. Các service này không chạy được trên serverless.
- Nếu `web`/`admin` ở Vercel thì service buộc phải mở ra Internet, trái P4.
- `admin` upload ảnh tới 8 MB, vượt giới hạn body của Vercel Functions.

Đội chọn phương án B, chạy trên Oracle Cloud Always Free.

## Quyết định

1. **Nơi chạy:**
   - Một máy ảo **Oracle Cloud Infrastructure, region Singapore (`ap-singapore-1`)**, shape **Ampere A1 (linux/arm64)**, Ubuntu, gói Always Free.
   - Tên miền `lavieco.io.vn`: site công khai ở `lavieco.io.vn` (`www` chuyển về đây), trang quản trị ở `admin.lavieco.io.vn`.
2. **Lớp biên:**
   - **Cloudflare proxy** đứng trước toàn bộ, SSL mode **Full (strict)**, dùng **Cloudflare Origin Certificate** trên máy chủ.
   - Tường lửa Oracle chỉ mở 80/443 cho dải IP của Cloudflare; cổng 22 chỉ mở cho IP quản trị.
3. **Trong máy chủ:**
   - Docker Compose (`infra/compose/compose.prod.yml`).
   - **Caddy** là container duy nhất publish cổng, và chỉ định tuyến tới `web`/`admin`.
   - Ba service và (tuỳ chọn) MongoDB nằm trên network nội bộ, không publish cổng nào. Điều này giữ được P4.
4. **Dữ liệu:**
   - **MongoDB Atlas, Singapore** (replica set), tài khoản DB theo `docs/03` §10.3.
   - Migration chạy bằng tài khoản `migrator` trong container một lần (profile `migrate`), tách khỏi service đang chạy.
   - MongoDB tự host (profile `mongo`) chỉ là phương án dự phòng, mặc định tắt.
5. **Phân phối:**
   - GitHub Actions build 5 image `linux/arm64` trên runner ARM native, đẩy lên **GHCR**, gắn tag theo commit SHA.
   - Deploy qua SSH: pull image, chạy migrate, `up --wait`.
   - Rollback bằng cách deploy lại một tag cũ (không đảo migration).
6. **Bí mật:**
   - Mỗi container một tệp env ở `/opt/lavieco/env` trên máy chủ (chmod 600).
   - Không có bí mật nào trong repo, trong image hay trong GitHub, ngoại trừ khoá SSH deploy.

## Hệ quả

- **Tốt:**
  - Giữ đúng P4 và ranh giới ADR-018. Chi phí hạ tầng gần như bằng 0 (Always Free + Atlas + Cloudflare free).
  - Cấu hình nằm trong repo, dựng lại máy chủ nhanh. Không phải sửa mã ứng dụng (chỉ thêm `output: "standalone"`).
- **Rủi ro chấp nhận:**
  - **Một điểm lỗi duy nhất.** Giảm thiểu bằng backup ra ngoài máy chủ, healthcheck, `restart: unless-stopped` và runbook dựng lại.
  - Đội tự vá hệ điều hành.
  - ISR/cache của Next chỉ có một instance.
- **Rủi ro riêng của Oracle Always Free:**
  - Oracle có thể **thu hồi máy ảo Always Free "nhàn rỗi"**.
  - Capacity A1 ở Singapore đôi khi hết, phải tạo lại.
  - Nên cân nhắc nâng tài khoản lên Pay As You Go (vẫn dùng tài nguyên miễn phí) để tránh bị thu hồi. **Đội cần xác nhận.**
- **Còn mở:**
  - **AQ4, lưu trữ dữ liệu trong nước:** máy chủ, Atlas, Cloudinary đều ở Singapore. Quyết định này **không** giải quyết AQ4; vẫn cần tham vấn pháp lý.
  - **AQ6** (ai quản trị hạ tầng).
  - **AQ7** (Cloudflare Access/IP allowlist cho `admin`).
  - **AQ8** (nhà cung cấp email).
  - **AQ3/DQ1/DQ2** (thời hạn lưu backup chứa PII).
  - Nơi lưu bản backup ngoài máy chủ.

## Việc cần làm sau khi ADR được duyệt

Chưa sửa các tài liệu dưới đây; chỉ cập nhật sau khi đội duyệt:

- `docs/02-kien-truc.md`:
  - §12.2: ghi phương án B đã chốt, nêu nhà cung cấp và region.
  - §12.1: môi trường production thực tế.
  - §12.3: Cloudflare Full (strict) + Origin Certificate + `trusted_proxies`.
  - §12.4: GHCR, runner arm64, `deploy.yml`, migrate bằng `migrator`, rollback theo tag.
  - §15: đóng **AQ1**, ghi AQ4 vẫn mở.
- `docs/03-co-so-du-lieu.md` §10.3: dòng `migrator` ghi "chỉ dùng trong pipeline". Thực tế thông tin xác thực nằm trong `/opt/lavieco/env/migrate.env` trên máy chủ và chỉ nạp vào container migrate. Cần ghi rõ.
- `docs/04-cau-truc-ma-nguon.md`:
  - §2: thêm `apps/*/Dockerfile`, `infra/caddy/`, `infra/deploy/`.
  - §15 / §15.1: trạng thái hạ tầng deploy.
- `CLAUDE.md`:
  - §4: lệnh deploy/rollback/backup.
  - §15: bỏ AQ1 khỏi bảng quyết định còn mở.
- `docs/runbooks/chay-local.md`: liên kết tới `deploy-oracle.md`.
