# Checklist deploy production: VPS + Docker Compose

> Cập nhật 23/10/2026, theo `main` sau PR #15 (`2e9a608`). Thay cho bản khảo sát Vercel ngày 18/10/2026: phương án đã chọn là **một VPS + Docker Compose + Caddy, dữ liệu trên MongoDB Atlas Singapore** (`docs/02` §12.2 phương án B, ADR-022 đang Đề xuất).
>
> Tài liệu này là **checklist cho mỗi lần deploy**. Lệnh chi tiết và giải thích nằm ở runbook `docs/runbooks/deploy-vps.md` (ghi `RB §x`). Không chứa giá trị bí mật nào; tên biến lấy từ `infra/env/prod/*.env.example` và `docs/06`. Không đọc `.env.deploy`/`.env.local`.

Alias trên máy chủ (user `lavieco`), dùng ở mọi lệnh dưới đây:

```bash
alias lv='docker compose --env-file /opt/lavieco/compose.env -f /opt/lavieco/infra/compose/compose.prod.yml'
```

---

## 0. Hiện trạng (so với khảo sát 18/10)

| Thành phần | 18/10 | Hiện tại |
|---|---|---|
| Dockerfile `web`, `admin` | Chưa có | Có (`apps/web/Dockerfile`, `apps/admin/Dockerfile`) |
| Dockerfile 3 service | Có | Có, `node:24-alpine`, `USER node`, không copy `.env*` |
| Compose production | Chưa có | `infra/compose/compose.prod.yml`: caddy + web + admin + identity/content/program, profile `migrate`, `mem_limit` cho máy 2 GB |
| Cửa ra Internet | — | Caddy (`infra/caddy/Caddyfile`), chỉ publish 80/443; `lavieco.io.vn` → web, `admin.lavieco.io.vn` → admin; HTTPS Let's Encrypt |
| Build image | Chỉ CI | `.github/workflows/release.yml`: 5 image amd64 → GHCR `ghcr.io/<owner>/lavieco-<tên>:<sha>` (+ `latest` trên `main`). VPS chỉ pull |
| Script máy chủ | — | `infra/deploy/scripts/deploy.sh`, `rollback.sh`, `mongo-backup.sh` |
| Mẫu env production | — | `infra/env/prod/*.env.example` (8 tệp) |
| `lead-service` | Khung rỗng | Vẫn rỗng, không deploy |

---

## 1. Biến môi trường theo container

Tệp thật nằm ở `/opt/lavieco/env/<tên>.env` (chmod 600) và trong trình quản lý mật khẩu của đội. Ý nghĩa từng biến: `docs/06`. Cách sinh khoá và điền: RB §4. Cột **Mới** đánh dấu biến xuất hiện sau khảo sát 18/10.

| Tệp | Biến | Mới |
|---|---|---|
| `compose.env` | `GHCR_OWNER`, `IMAGE_TAG`, `ACME_EMAIL` | ✓ (cả tệp) |
| `web.env` | `NODE_ENV`, `LOG_LEVEL`, `IDENTITY_SERVICE_URL`, `PROGRAM_SERVICE_URL`, `CONTENT_SERVICE_URL`, `ADMIN_APP_URL`, `SERVICE_TOKEN_PRIVATE_JWK`, `REVALIDATE_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_REDIRECT_URI` | |
| | `TURNSTILE_ENABLED`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` (cặp khoá **production thật**, hostname `lavieco.io.vn`; `TURNSTILE_ENABLED=true`) | ✓ (nay bắt buộc dùng: widget reset sau mỗi lần gửi, PR #15) |
| `admin.env` | `NODE_ENV`, `LOG_LEVEL`, `IDENTITY_SERVICE_URL`, `PROGRAM_SERVICE_URL`, `CONTENT_SERVICE_URL`, `WEB_APP_URL`, `SERVICE_TOKEN_PRIVATE_JWK` | |
| | `ADMIN_APP_URL` (link chuyển hướng dựng từ biến này, không từ request) | ✓ |
| `identity-service.env` | `NODE_ENV`, `PORT`, `LOG_LEVEL`, `MONGODB_URI`, `MONGODB_DB`, `JWT_SIGNING_KEYS`, `SERVICE_TOKEN_TRUSTED_KEYS`, `TOTP_ENCRYPTION_KEY`, `OTP_PEPPER`, `*_TTL_*` (4 biến), `ADMIN_APP_URL`, `WEB_APP_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | |
| | Khối mail (ADR-023): `MAIL_PROVIDER`, `MAIL_FROM`, `MAIL_FROM_FALLBACK`, `MAIL_REPLY_TO`, `BREVO_SMTP_HOST`, `BREVO_SMTP_PORT`, `BREVO_SMTP_USER`, `BREVO_SMTP_KEY`, `BREVO_COOLDOWN_MINUTES`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | ✓ (`MAIL_FROM_FALLBACK`, `MAIL_REPLY_TO`, `BREVO_*`) |
| `content-service.env` | `NODE_ENV`, `PORT`, `LOG_LEVEL`, `MONGODB_URI`, `MONGODB_DB`, `SERVICE_TOKEN_TRUSTED_KEYS`, `IDENTITY_JWKS_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (product environment **production**) | |
| `program-service.env` | `NODE_ENV`, `PORT`, `LOG_LEVEL`, `MONGODB_URI`, `MONGODB_DB`, `SERVICE_TOKEN_TRUSTED_KEYS`, `IDENTITY_JWKS_URL`, `IDENTITY_SERVICE_URL`, `CONTENT_SERVICE_URL`, `SERVICE_TOKEN_PRIVATE_JWK`, `WEB_APP_URL`, `REVALIDATE_SECRET`, `TICKET_LINK_SECRET`, `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` | |
| | Khối mail giống hệt `identity-service.env` | ✓ |
| `migrate.env` | `MONGODB_URI` (tài khoản `migrator`, ghi đè khi chạy profile `migrate`) | ✓ |
| `backup.env` | `BACKUP_MONGODB_URI` (tài khoản `backup`, chỉ đọc) | ✓ |
| Biến repository GitHub (công khai, nhúng lúc build) | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | ✓ |

Ràng buộc chéo phải đúng trước mỗi deploy (RB §4.1, §4.2):

- [ ] Mỗi khoá riêng (JWK có `"d"`) chỉ ở **một** tệp; khoá công khai của `web`/`admin`/`program-service` có trong `SERVICE_TOKEN_TRUSTED_KEYS` đúng nơi (bảng ở `docs/06` "Service token"). Khoá **production riêng**, không dùng lại khoá dev.
- [ ] `REVALIDATE_SECRET`: `web.env` = `program-service.env`.
- [ ] `GOOGLE_CLIENT_ID`, `GOOGLE_REDIRECT_URI`: `web.env` = `identity-service.env`.
- [ ] Khối mail: `identity-service.env` = `program-service.env`; `MAIL_FROM_FALLBACK` khác tên miền `MAIL_FROM`.
- [ ] `CLOUDINARY_CLOUD_NAME` = biến repository `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (cùng môi trường production). Đổi biến `NEXT_PUBLIC_*` thì phải build lại image.
- [ ] URL giữa container dùng tên service (`http://identity-service:4001`, `http://content-service:4002`, `http://program-service:4004`, JWKS `http://identity-service:4001/.well-known/jwks.json`); URL ra trình duyệt/email/Google/payOS dùng tên miền công khai.
- [ ] `MONGODB_DB` là `lavieco_<tên>`, **không** hậu tố `_dev` (service từ chối khởi động nếu sai).
- [ ] Không có giá trị bí mật nào trong repo, issue, PR, chat.

---

## 2. Trước khi deploy

### 2.1 Bản release

- [ ] Commit cần deploy đã ở `main`, CI xanh (`lint`, `typecheck`, `deps:check`, `test`, `build`).
- [ ] Workflow **Release** của commit đó xong: 5 image `ghcr.io/<owner>/lavieco-{web,admin,identity-service,content-service,program-service}:<sha>`.
- [ ] Đọc migration mới trong `services/*/migrations/` của bản này (mục 6 ghi các migration của bản hiện tại).
- [ ] Ghi lại tag đang chạy để rollback: `grep IMAGE_TAG /opt/lavieco/compose.env` và `tail -3 /opt/lavieco/deployments.log`.
- [ ] Chọn giờ ít người dùng: `up` tạo lại container, gián đoạn vài giây (một instance mỗi thành phần). Không deploy khi đang có chương trình mở bán đông người hoặc đang check-in.

### 2.2 Backup Atlas (bắt buộc trước mỗi deploy có migration, nên làm mọi lần)

- [ ] Chạy backup tay, không đợi cron:

  ```bash
  /opt/lavieco/infra/deploy/scripts/mongo-backup.sh
  ls -lh /opt/lavieco/backups | tail -3        # tệp mới, dung lượng hợp lý (không 0 byte)
  ```

- [ ] Nếu cluster là M10 trở lên: tạo thêm **on-demand snapshot** trên Atlas (Clusters → Backup → Take Snapshot Now). M0 **không** có backup tự động: bản `mongodump` ở trên là bản duy nhất.
- [ ] Chép bản backup **ra khỏi VPS** (máy chủ là một điểm lỗi). Tệp chứa dữ liệu cá nhân: mã hoá trước khi lưu ở nơi khác, không gửi qua chat/email. Nơi lưu chính thức và thời hạn giữ là việc đội còn phải quyết (RB §8; AQ3/DQ1/DQ2/DQ8).
- [ ] Ghi thời điểm backup vào ghi chú deploy (mốc dữ liệu nếu phải khôi phục).

### 2.3 Đồng bộ `infra/` lên máy chủ

`infra/` trên máy chủ phải **cùng commit** với image (RB §5.2). Trên máy dev:

```bash
git checkout <sha>
rsync -az --delete infra/compose infra/caddy infra/deploy lavieco@<IP>:/opt/lavieco/infra/
```

- [ ] Nếu bản này thêm/đổi biến môi trường: cập nhật `/opt/lavieco/env/*.env` theo `infra/env/prod/*.env.example` **trước** khi chạy deploy.

---

## 3. Deploy (pull → migrate → up)

Trên máy chủ, user `lavieco`:

```bash
/opt/lavieco/infra/deploy/scripts/deploy.sh <sha>
```

`deploy.sh` làm lần lượt (RB §6):

- [ ] `lv --profile migrate pull`: kéo 5 image của `<sha>` (lần đầu ~1 GB, nên pull sẵn trước giờ deploy).
- [ ] Migration từng service bằng tài khoản `migrator`: `identity-migrate`, `content-migrate`, `program-migrate` (`node dist/cli/migrate.js`, idempotent).
- [ ] `lv up -d --remove-orphans --wait --wait-timeout 300`: chờ mọi container **healthy** (service: `/health/ready`; web: `/icon.png`; admin: `/login`; caddy: admin API).
- [ ] Thành công: ghi `IMAGE_TAG=<sha>` vào `compose.env`, thêm dòng vào `deployments.log`, dọn image *dangling*.
- [ ] Thất bại: script dừng, **không** ghi log; xem `lv ps`, `lv logs --since=10m <tên>`, rồi quyết định sửa hay rollback (mục 5).

Lần đầu tiên dựng máy chủ: làm theo RB §1–§5 (tường lửa, swap, Docker, DNS, Atlas, env, bật stack từng bước, việc một lần như tạo Super Admin, `media-setup`, webhook payOS, `mail-test`, Google OAuth).

---

## 4. Smoke test sau deploy

### 4.1 Tự động bằng `curl` (từ máy bất kỳ)

```bash
B=https://lavieco.io.vn; A=https://admin.lavieco.io.vn; SLUG=<slug một chương trình đang mở>
for u in "$B/" "$B/chuong-trinh" "$B/chuong-trinh/$SLUG" "$B/tra-cuu-ve" "$B/dang-nhap" \
         "$B/bo-suu-tap" "$B/cau-chuyen" "$B/sap-ra-mat" "$B/icon.png" "$A/login"; do
  printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "$u")" "$u"
done                                                               # tất cả 200
curl -s -o /dev/null -w '%{http_code}\n' "$B/chuong-trinh/khong-ton-tai-xyz"   # 404
curl -s -o /dev/null -w '%{http_code}\n' "$B/trang-khong-co"                    # 404
curl -s -o /dev/null -w '%{http_code}\n' "http://lavieco.io.vn/"                # 301/308 sang https
curl -sI "$B/chuong-trinh/$SLUG/lich" | grep -i '^content-type'                 # text/calendar
curl -s "$B/bo-suu-tap" | grep -o '<meta name="robots"[^>]*>'                   # noindex
curl -sI "$B/" | grep -iE 'strict-transport-security|x-content-type-options|referrer-policy|permissions-policy'
```

- [ ] Các trang trả đúng mã như chú thích; trang sắp ra mắt và 404 có `noindex`.
- [ ] Header bảo mật có mặt: HSTS (Caddy); `nosniff`, `referrer-policy`, `permissions-policy` (`apps/*/src/proxy.ts`). Trang thường không nhúng được vào iframe; chỉ `/xem-truoc/chuong-trinh/...` cho phép origin admin.

### 4.2 Trên máy chủ

```bash
lv ps                                                    # mọi container "healthy"
lv logs --since=15m | grep -E '"level":"(error|fatal)"' | tail -20   # không lỗi mới
docker stats --no-stream                                 # RAM dưới mem_limit, swap không tăng mạnh
```

### 4.3 Bằng tay, theo luồng (5–10 phút)

- [ ] Trang chủ, `/chuong-trinh`: danh sách hiện đúng, lọc bằng URL chạy, ảnh Cloudinary tải được (không 404 ảnh).
- [ ] Chi tiết chương trình: thẻ vé, "Thêm vào lịch", JSON-LD có trong HTML (`application/ld+json`).
- [ ] Đặt vé **miễn phí** bằng email thật của đội: nhận OTP (Brevo; xem log `mail sent`), nhận email vé có QR, `/ve/<token>` mở được.
- [ ] Đặt vé **có phí** số tiền nhỏ: hiện VietQR; thanh toán → đơn chuyển "đã thanh toán" **nhờ webhook** (BR-15), email vé tới. Hoàn tiền thủ công nếu là đơn thử.
- [ ] Turnstile: widget hiện, gửi form thành công; gửi lần hai không bị "Xác minh chưa thành công" (token mới mỗi lần).
- [ ] Bấm "Tiếp tục" khi form trống: cuộn tới trường lỗi đầu tiên, dòng "Còn N mục cần điền hoặc sửa", không có câu tiếng Anh.
- [ ] Đăng nhập member (email + mật khẩu, Google nếu bật).
- [ ] Admin: đăng nhập + 2FA, mở `/events`, sửa một chương trình (lưu được), upload ảnh banner/poster (≤ 8 MB).
- [ ] `/tra-cuu-ve`: nhận mã, thấy vé vừa đặt.

Có bước nào hỏng mà không sửa nhanh được: rollback (mục 5).

---

## 5. Rollback về bản trước

Rollback = chạy lại **image cũ**, **không** đảo migration (migration luôn mở rộng → co lại, tương thích ngược ít nhất một bản, `docs/03` §10.1). RB §7.

```bash
cat /opt/lavieco/deployments.log                        # các tag đã chạy thành công
/opt/lavieco/infra/deploy/scripts/rollback.sh           # tag thành công gần nhất trước tag hiện tại
/opt/lavieco/infra/deploy/scripts/rollback.sh <sha>     # hoặc một tag cụ thể
```

- [ ] Nếu bản cũ cần `compose.prod.yml`/`Caddyfile` cũ: `git checkout <sha cũ>` và chép lại `infra/` lên máy chủ (mục 2.3) **trước** khi chạy `rollback.sh`.
- [ ] Chạy lại smoke test 4.1–4.2 trên bản cũ.
- [ ] Ghi lại lý do rollback và tag lỗi; không deploy lại tag đó khi chưa sửa.

**Khôi phục dữ liệu từ backup** chỉ khi dữ liệu hỏng (không phải khi code lỗi), và cần đội quyết vì mất mọi đơn/đăng ký sau mốc backup:

1. Khôi phục bản `mongodump` vào database tạm `*_restoretest` bằng tài khoản tạm (RB §8), kiểm tra.
2. Chỉ khi đội đồng ý mới ghi đè database thật (`mongorestore --drop` theo từng `--nsInclude`), trong giờ dừng dịch vụ (`lv stop web admin`), rồi đối soát đơn payOS phát sinh sau mốc backup.

---

## 6. Ghi chú riêng cho bản hiện tại (`main` sau PR #15)

Áp dụng cho lần deploy đầu tiên chứa redesign trang Chương trình.

- [ ] **Migration** `services/program-service/migrations/202610220001-event-page-fields.cjs`: điền mặc định cho các trường mới (banner, minAge, benefits, cancellationRules, speaker bio/avatar, attendance) và **tính lại `pricing.isFree`** theo nghĩa mới (mọi loại vé 0đ). Idempotent; backup 2.2 là bắt buộc.
- [ ] **Permission mới** `impact:approve` (chỉ Super Admin): không cần env; kiểm tra Super Admin thấy nút "Duyệt số người tham gia" ở sự kiện lưu trữ.
- [ ] **Turnstile** phải là cặp khoá production thật (`TURNSTILE_ENABLED=true`); khoá test của Cloudflare luôn "thành công" sẽ vô hiệu chống bot.
- [ ] **Không chạy seed dev** ở production. Image có `dist/cli/dev-seed.js` (biên dịch cùng `src/cli`) nhưng lệnh tự từ chối mọi database không phải Mongo local; không thử.
- [ ] Sau deploy, trong admin: **gỡ xuất bản hoặc huỷ các chương trình test** còn đang xuất bản (vd "búdfđ", "test"); **up banner 21:9 và poster 4:5** cho các chương trình cũ, thêm "Bạn sẽ nhận" và bảng chính sách huỷ nếu có.
- [ ] **Rollback sau bản này:** bản cũ không biết trạng thái `cancelled`. Nếu đã huỷ chương trình nào trên bản mới rồi rollback, trang admin của bản cũ có thể lỗi khi đọc chương trình đó. Tránh huỷ chương trình trong vài giờ đầu sau deploy, cho tới khi chắc không cần rollback.
- [ ] Commit `2fc6ed2` (nút "Hợp tác" trỏ `/#lien-he` + test 404 cho slug lạ) được push **sau** khi PR #15 merge nên **chưa có trong `main`**. Nếu muốn có trong lần deploy này: mở PR riêng cho commit đó, merge, rồi deploy commit mới. Nếu không, nút "Hợp tác" dẫn tới trang "sắp ra mắt" `/hop-tac`.
- [ ] Theo dõi 24 giờ đầu: `lv logs --since=24h identity-service program-service | grep -E 'mail (sent|provider failed|delivery failed)'` (Brevo 300 email/ngày, RB §9).

---

## 7. Còn mở, ngoài phạm vi checklist

- Nơi lưu backup ngoài VPS, mã hoá, thời hạn giữ (AQ3/DQ1/DQ2/DQ8).
- Bảo vệ thêm cho `admin` (Cloudflare Access / IP allowlist, AQ7).
- Cloudflare proxy phía trước Caddy (tuỳ chọn, RB §2).
- Lưu trữ dữ liệu trong nước (AQ4).
- ADR-022 (VPS) và ADR-023 (Brevo + Gmail) còn ở trạng thái Đề xuất.
- Backlog B5/B6 (`docs/backlog.md`) không ảnh hưởng deploy.
