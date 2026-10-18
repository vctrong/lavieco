# ADR-022: Hosting GĐ1 trên một VPS bằng Docker Compose (chốt AQ1)

| | |
|---|---|
| **Trạng thái** | Đề xuất (Proposed). Chờ đội duyệt |
| **Ngày** | 18/10/2026 |
| **Người đề xuất** | V.C. Trọng |
| **Liên quan** | `docs/02` §3.3 (P4), §12.2 (ADR-006), §12.3, §12.4, §15 (AQ1, AQ4, AQ6, AQ7, AQ8); `docs/03` §10.3; ADR-018, ADR-020; `docs/runbooks/deploy-vps.md` |
| **Thay cho** | Bản nháp trước của ADR này (Oracle Cloud Ampere A1, arm64), chưa từng được duyệt |

## Bối cảnh

`docs/02` §12.2 so sánh ba phương án hosting và khuyến nghị **B: một máy chủ + Docker Compose + Cloudflare**, vì nguyên tắc **P4**: service không được mở ra Internet. AQ1 (chốt phương án và ngân sách) vẫn đang mở.

Khảo sát phương án A (`web`/`admin` lên Vercel, `docs/DEPLOY_AUDIT.md`) cho thấy:

- Ba service NestJS chạy liên tục với worker nền `setInterval` (outbox 1 giây, hết hạn giữ chỗ 60 giây theo BR-14, dọn ảnh 15 phút): không chạy được trên serverless.
- `web`/`admin` ở Vercel thì service buộc phải mở ra Internet, trái P4.
- `admin` upload ảnh tới 8 MB, vượt giới hạn body của Vercel Functions.

Bản nháp đầu chọn Oracle Cloud Always Free (arm64). Đội chuyển sang một VPS amd64 trả phí nhỏ, đặt tại Việt Nam, để tránh rủi ro Oracle thu hồi máy Always Free và hết capacity A1.

## Quyết định

1. **Nơi chạy:**
   - **Lanit, gói Cloud VPS 1**, datacenter **FPT tại Việt Nam**: Ubuntu 24.04, **2 vCPU, 2 GB RAM, 40 GB SSD**, linux/amd64, swap 2 GB.
   - Băng thông quốc tế **10–20 Mbps** (xem Rủi ro).
   - IP của máy chủ **không** ghi vào repo.
   - Tên miền `lavieco.io.vn` (`www` chuyển về đây), quản trị ở `admin.lavieco.io.vn`.
2. **Trong máy chủ:**
   - Docker Compose (`infra/compose/compose.prod.yml`), 6 container: `caddy`, `web`, `admin`, `identity-service`, `content-service`, `program-service`, trên **một network nội bộ**.
   - **Caddy là container duy nhất publish cổng (80/443)**, và chỉ định tuyến tới `web`/`admin`. Service không publish cổng nào, nên giữ được P4.
   - Mỗi container có `mem_limit` và trần heap Node (`--max-old-space-size`) vừa ngân sách 2 GB (MB, giới hạn/heap):

     | Container | Giới hạn / heap |
     |---|---|
     | caddy | 64 |
     | web | 384 / 256 |
     | admin | 320 / 224 |
     | identity-service | 256 / 192 |
     | program-service | 320 / 224 |
     | content-service | 448 / 320 |

   - Healthcheck bằng `wget` của busybox. `web`/`admin` chỉ khởi động khi ba service đã healthy.
3. **Lớp biên:**
   - Caddy tự xin chứng chỉ **Let's Encrypt**, nén zstd/gzip, giới hạn body (admin 10 MB cho ảnh 8 MB, web 4 MB).
   - DNS ở chế độ **DNS only**.
   - Cloudflare proxy (`docs/02` §12.3) là **bước tuỳ chọn làm sau**. Caddyfile đã sẵn `trusted_proxies` cho dải IP Cloudflare.
4. **Dữ liệu:**
   - **MongoDB Atlas, Singapore** (replica set), tài khoản DB theo `docs/03` §10.3.
   - Không tự host MongoDB trên VPS (không đủ RAM).
   - Migration chạy bằng tài khoản `migrator` trong container một lần (profile `migrate`), tách khỏi service đang chạy.
5. **Phân phối:**
   - GitHub Actions (`.github/workflows/release.yml`) build 5 image `linux/amd64` khi push `main` hoặc khi chạy tay.
   - Image đẩy lên **GHCR (private)**, tag theo commit SHA và `latest`, cache `type=gha`, xác thực bằng `GITHUB_TOKEN`.
   - **VPS chỉ pull, không build.** VPS đăng nhập GHCR bằng PAT chỉ có quyền `read:packages`.
   - Deploy tay bằng `infra/deploy/scripts/deploy.sh <sha>` (pull → migrate → `up --wait`).
   - Rollback bằng cách chạy lại một `IMAGE_TAG` cũ (không đảo migration).
   - **Chưa** có bước deploy tự động qua SSH.
6. **Bí mật:**
   - Mỗi container một tệp env ở `/opt/lavieco/env` trên máy chủ (chmod 600). Mẫu chỉ có tên biến, ở `infra/env/prod/`.
   - Không có bí mật nào trong repo, trong image hay trong GitHub, ngoài `GITHUB_TOKEN` tự cấp của workflow. PAT `read:packages` chỉ nằm trên VPS.
7. **Bỏ `deploy.yml` của bản nháp Oracle:**
   - Workflow đó build `linux/arm64` và đẩy **cùng tag commit SHA** với `release.yml`. Giữ cả hai thì image arm64 sẽ ghi đè image amd64, và VPS sẽ pull sai kiến trúc.
   - Bước SSH deploy của nó cũng chưa cần ở giai đoạn này.
   - Có thể khôi phục từ commit `c1414b6`.

## Hệ quả

- **Tốt:**
  - Giữ đúng P4 và ranh giới ADR-018; URL giữa các container là tên service nội bộ.
  - Chi phí thấp, dự đoán được (một VPS + Atlas + Let's Encrypt).
  - Người dùng ở Việt Nam truy cập máy chủ trong nước, độ trễ thấp.
  - Cấu hình nằm trong repo, dựng lại máy chủ nhanh. Không sửa mã ứng dụng, ngoài `output: "standalone"` và việc cho `/tra-cuu-ve` render theo request.
- **Rủi ro chấp nhận:**
  - **Băng thông quốc tế 10–20 Mbps.** Mọi lưu lượng ra nước ngoài đi qua đường này:
    - truy vấn MongoDB Atlas Singapore (mỗi request có thể gồm nhiều truy vấn);
    - upload ảnh lên Cloudinary (8 MB mất khoảng 4–7 giây ở 10–20 Mbps);
    - pull image từ GHCR (khoảng 1 GB cho 5 image ở lần đầu);
    - SMTP, payOS, Google OAuth, Let's Encrypt.

    Khi đường quốc tế chậm hoặc gián đoạn (ví dụ sự cố cáp biển), site trong nước vẫn mở được nhưng mọi thao tác cần DB sẽ chậm hoặc lỗi. Giảm thiểu:
    - đo độ trễ tới Atlas sau lần deploy đầu;
    - deploy ngoài giờ cao điểm;
    - dọn image cũ để không phải pull lại;
    - nếu đo thấy không đạt: cân nhắc VPS tại Singapore, hoặc MongoDB trong nước (khi đó cần máy nhiều RAM hơn).
  - **RAM sát trần:** tổng `mem_limit` khoảng 1,8 GB trên 2 GB, cộng 192 MB lúc migrate. Có swap 2 GB; theo dõi `docker stats`. Nâng lên 4 GB nếu thấy OOM-kill hoặc swap bị dùng liên tục.
  - **Đĩa 40 GB:** image các bản cũ, log Docker (tối đa 50 MB mỗi container) và bản backup cùng nằm trên đĩa. Phải dọn image cũ định kỳ.
  - **Một điểm lỗi duy nhất**, và mỗi lần deploy gián đoạn vài giây (không rolling). Giảm thiểu: backup ra ngoài máy chủ, healthcheck, `restart: unless-stopped`, runbook dựng lại.
  - Đội tự vá hệ điều hành. ISR/cache của Next chỉ có một instance.
- **Còn mở:**
  - **AQ4:** máy chủ ứng dụng nay ở Việt Nam, nhưng dữ liệu cá nhân vẫn nằm ở Atlas (Singapore) và Cloudinary (ngoài nước). ADR này **không** giải quyết AQ4; vẫn cần tham vấn pháp lý.
  - **AQ6:** ai quản trị hạ tầng.
  - **AQ7:** Cloudflare Access hoặc IP allowlist cho `admin`.
  - **AQ8:** nhà cung cấp email.
  - **AQ3/DQ1/DQ2:** thời hạn lưu backup chứa PII.
  - Nơi lưu backup ngoài máy chủ.

## Chuyển tiếp sau này

- **Sang Oracle Cloud (Ampere A1, arm64) hoặc một máy ARM khác:**
  - Không tạo lại workflow riêng. Build **đa kiến trúc** trong chính `release.yml` bằng `platforms: linux/amd64,linux/arm64`.
  - Có hai cách: thêm `docker/setup-qemu-action` (chậm, Next.js qua QEMU mất hàng chục phút), hoặc build từng kiến trúc trên runner native (`ubuntu-24.04` và `ubuntu-24.04-arm`) rồi gộp manifest bằng `docker buildx imagetools create`.
  - Cùng một tag SHA sẽ chạy được trên cả hai loại máy, nên rollback và chuyển máy không cần build lại.
  - `sharp` có bản dựng sẵn cho `linuxmusl-arm64`. Compose và Caddyfile không đổi.
- **Thêm Cloudflare proxy:** làm theo bước tuỳ chọn trong runbook §2. Khi đó cân nhắc chuyển sang Cloudflare Origin Certificate nếu gia hạn Let's Encrypt qua proxy gặp lỗi.
- **Deploy tự động:** thêm job SSH (có environment `production` và người duyệt) vào `release.yml` khi đội cần.

## Việc cần làm sau khi ADR được duyệt

Chưa sửa các tài liệu dưới đây; chỉ cập nhật sau khi đội duyệt:

- `docs/02-kien-truc.md`:
  - §12.2: ghi phương án B đã chốt (Lanit Cloud VPS 1, FPT Việt Nam, 2 vCPU/2 GB) và rủi ro băng thông quốc tế.
  - §12.1: môi trường production thực tế.
  - §12.3: Caddy + Let's Encrypt; Cloudflare là bước tuỳ chọn; `trusted_proxies`; giới hạn body.
  - §12.4: GHCR private, `release.yml` (push `main`, tag SHA + `latest`), deploy tay bằng `deploy.sh`, migrate bằng `migrator`, rollback theo `IMAGE_TAG`.
  - §15: đóng **AQ1**, ghi AQ4 vẫn mở.
- `docs/03-co-so-du-lieu.md` §10.3: thông tin xác thực `migrator` nằm trong `/opt/lavieco/env/migrate.env` trên máy chủ, chỉ nạp vào container migrate.
- `docs/04-cau-truc-ma-nguon.md`:
  - §2: thêm `apps/*/Dockerfile`, `infra/caddy/`, `infra/env/prod/`, `infra/deploy/`.
  - §15 / §15.1: trạng thái hạ tầng deploy.
- `CLAUDE.md`:
  - §4: lệnh deploy, rollback, backup.
  - §15: bỏ AQ1 khỏi bảng quyết định còn mở.
- `docs/runbooks/chay-local.md`: thêm liên kết tới `deploy-vps.md`.
