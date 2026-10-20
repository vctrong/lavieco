# Runbook: deploy production trên một VPS

Áp dụng cho phương án B trong `docs/02` §12.2, chi tiết ở **ADR-022 (đang ở trạng thái Đề xuất)**: một VPS **Lanit Cloud VPS 1 (datacenter FPT, Việt Nam), Ubuntu 24.04, 2 vCPU, 2 GB RAM, 40 GB SSD, linux/amd64** chạy Docker Compose; Caddy là cửa duy nhất ra Internet; dữ liệu trên **MongoDB Atlas Singapore**. Image được build ở GitHub Actions và đẩy lên GHCR; **VPS chỉ pull, không bao giờ build**.

Các tệp liên quan:

| Tệp | Vai trò |
|---|---|
| `infra/compose/compose.prod.yml` | Stack production: caddy, web, admin, 3 service trên một network nội bộ; profile `migrate` |
| `infra/caddy/Caddyfile` | `lavieco.io.vn` → web, `admin.lavieco.io.vn` → admin; HTTPS tự động (Let's Encrypt); nén zstd/gzip; giới hạn body |
| `infra/env/prod/*.env.example` | Mẫu tệp env cho từng container (chỉ tên biến và URL không bí mật) |
| `infra/env/prod/compose.env.example` | Biến của chính compose (`GHCR_OWNER`, `IMAGE_TAG`, `ACME_EMAIL`) |
| `infra/deploy/scripts/{deploy,rollback,mongo-backup}.sh` | Chạy trên máy chủ |
| `.github/workflows/release.yml` | Build 5 image amd64 → GHCR, tag theo commit SHA và `latest` |

Bố cục trên máy chủ (không nằm trong repo, trừ `infra/` được chép lên):

```
/opt/lavieco/
  compose.env            biến của compose (không bí mật)
  deployments.log        lịch sử tag đã deploy thành công (deploy.sh ghi)
  infra/                 compose/, caddy/, deploy/  ← chép từ repo, cùng commit với image
  env/                   web.env, admin.env, identity-service.env, content-service.env,
                         program-service.env, migrate.env, backup.env   (chmod 600)
  backups/               bản mongodump
```

Alias cho user deploy (`~/.bashrc`), dùng ở mọi lệnh bên dưới:

```bash
alias lv='docker compose --env-file /opt/lavieco/compose.env -f /opt/lavieco/infra/compose/compose.prod.yml'
```

**Quy tắc chung:** không dán giá trị bí mật vào chat, issue, PR hay commit. Tệp env chỉ nằm trên máy chủ (chmod 600) và trong trình quản lý mật khẩu của đội.

---

## 1. Chuẩn bị máy chủ

### 1.1 Tường lửa

Docker ghi luật iptables riêng và **đi vòng qua UFW** với mọi cổng được publish. Stack này chỉ publish 80/443 của Caddy, nên vẫn an toàn, nhưng lớp chặn chính nên là **tường lửa của nhà cung cấp VPS**:

| Hướng | Cổng | Nguồn |
|---|---|---|
| Ingress | TCP 22 | Chỉ IP quản trị (hoặc khoá SSH + fail2ban nếu IP không cố định) |
| Ingress | TCP 80, 443, UDP 443 | `0.0.0.0/0` (hoặc chỉ dải IP Cloudflare nếu dùng proxy Cloudflare, §2) |
| Egress | Tất cả | Atlas, SMTP (Brevo `smtp-relay.brevo.com:587`, Gmail `smtp.gmail.com:587`), Cloudinary, payOS, GHCR, Let's Encrypt |

Không mở 3000/3001/4001/4002/4004: các container đó không publish cổng nào.

### 1.2 Hệ điều hành, swap

```bash
sudo apt update && sudo apt -y full-upgrade
sudo apt -y install unattended-upgrades fail2ban rsync
sudo dpkg-reconfigure -plow unattended-upgrades

# SSH chỉ bằng khoá.
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl reload ssh

# Swap 2 GB: BẮT BUỘC với 2 GB RAM. Tổng mem_limit của stack ≈ 1,8 GB; lúc migrate
# (thêm 192 MB) hoặc lúc pull/giải nén image, máy dễ chạm trần.
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swappiness.conf && sudo sysctl --system
```

### 1.3 Docker Engine

Cài theo hướng dẫn chính thức "Install Docker Engine on Ubuntu" (apt repository `download.docker.com`): `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-compose-plugin`. Kiểm tra:

```bash
docker version --format '{{.Server.Arch}}'   # amd64
docker compose version
```

### 1.4 User deploy và thư mục

```bash
sudo adduser --disabled-password --gecos "" lavieco
sudo usermod -aG docker lavieco          # lưu ý: nhóm docker tương đương quyền root
sudo mkdir -p /opt/lavieco/{infra,env,backups}
sudo chown -R lavieco:lavieco /opt/lavieco
sudo chmod 700 /opt/lavieco/env /opt/lavieco/backups
```

---

## 2. DNS và TLS

Ba bản ghi `A` trỏ tới IP của VPS: `lavieco.io.vn`, `www`, `admin` (người đứng tên miền: AQ5).

Bản ghi để ở chế độ **DNS only** (nếu DNS ở Cloudflare: mây xám). Caddy tự xin chứng chỉ Let's Encrypt cho cả ba tên ở lần chạy đầu, lưu trong volume `lavieco_caddy_data`. Điều kiện: cổng 80 và 443 truy cập được từ Internet, DNS đã trỏ đúng. Kiểm tra bằng `lv logs caddy | grep -i "certificate obtained"`.

**Bước tuỳ chọn, làm sau: đặt Cloudflare proxy phía trước** (khuyến nghị của `docs/02` §12.3; có WAF, chống DDoS). Chỉ làm khi stack đã chạy ổn với chứng chỉ Let's Encrypt:

1. Xác nhận Caddy đã có chứng chỉ cho cả ba tên (như trên).
2. Chuyển bản ghi sang **Proxied** (mây cam), SSL/TLS mode **Full (strict)**.
3. Gia hạn về sau đi qua HTTP-01 xuyên Cloudflare. Theo dõi `lv logs caddy | grep -i renew` khi gần hết hạn (90 ngày). Nếu gia hạn lỗi, chuyển sang Cloudflare Origin Certificate (ADR-022, "Chuyển tiếp sau này").
4. **Security → WAF → Custom rules:** tạo rule *Skip* (bỏ Bot Fight Mode/challenge) cho `/api/payments/payos/webhook` (payOS gọi từ máy chủ của họ) và `/api/revalidate` (`program-service` gọi qua `WEB_APP_URL` công khai).
5. `trusted_proxies` trong `Caddyfile` đã có dải IP Cloudflare: IP thật của người dùng lấy từ `CF-Connecting-IP` (cần cho giới hạn tần suất OTP). Dải IP Cloudflare đổi thì cập nhật Caddyfile.

**Turnstile:** widget production với hostname `lavieco.io.vn`, khoá điền vào `web.env`. Bảo vệ thêm cho `admin` (Cloudflare Access/IP allowlist) là **AQ7, còn mở**.

---

## 3. MongoDB Atlas

1. Cluster **AWS Singapore (ap-southeast-1)**. Tier M0 miễn phí **không có backup tự động** và giới hạn kết nối; kiểm tra custom role và transaction trên tier đã chọn trước khi chốt.
2. **Database Access** theo `docs/03` §10.3, mỗi tài khoản một mật khẩu ngẫu nhiên riêng:

   | Tài khoản | Quyền | Dùng ở |
   |---|---|---|
   | `svc_identity` | Custom role: `find`, `insert`, `update`, `remove` trên `lavieco_identity`; `audit_events` chỉ `find` + `insert` | `identity-service.env` |
   | `svc_content` | Custom role: `find`, `insert`, `update`, `remove` trên `lavieco_content` | `content-service.env` |
   | `svc_program` | Custom role: `find`, `insert`, `update`, `remove` trên `lavieco_program` | `program-service.env` |
   | `migrator` | Tạo/sửa index và collection trên 3 database | `migrate.env` |
   | `backup` | Chỉ đọc trên 3 database | `backup.env` |

   > Quyền tối thiểu của custom role **chưa được thử với ứng dụng thật**. Nếu service log `not authorized`, bổ sung đúng action còn thiếu; không đổi sang `readWrite`.
3. **Network Access:** chỉ IP của VPS. Không dùng `0.0.0.0/0`.
4. `MONGODB_URI` dạng `mongodb+srv://<user>:<password>@<cluster>/`; `MONGODB_DB` riêng (`lavieco_identity`…). Production **không** dùng database `_dev`; service từ chối khởi động.

---

## 4. Sinh khoá và điền tệp env

Ý nghĩa từng biến: `docs/06-bien-moi-truong.md`. Mẫu ở `infra/env/prod/` đã ghi rõ biến nào phải khớp biến nào. URL **giữa các container** dùng tên service nội bộ (`http://identity-service:4001`, `http://content-service:4002`, `http://program-service:4004`, `IDENTITY_JWKS_URL=http://identity-service:4001/.well-known/jwks.json`); URL **lộ ra trình duyệt/email/Google/payOS** dùng tên miền công khai (`https://lavieco.io.vn`, `https://admin.lavieco.io.vn`).

### 4.1 Khoá service token và giá trị ngẫu nhiên

Trên máy dev, ở gốc repo (chỉ in ra màn hình, không ghi tệp):

```bash
npm run keys:generate -- web
npm run keys:generate -- admin
npm run keys:generate -- program-service
npm run keys:generate -- identity-service    # khoá ký token người dùng
```

Mỗi lần in `PRIVATE_JWK`, `PUBLIC_JWK`, `RANDOM_32B_1`, `RANDOM_32B_2`. Giá trị JSON bọc trong **dấu nháy đơn**.

| Giá trị | Điền vào |
|---|---|
| `PRIVATE_JWK` của `web` | `web.env` → `SERVICE_TOKEN_PRIVATE_JWK` |
| `PRIVATE_JWK` của `admin` | `admin.env` → `SERVICE_TOKEN_PRIVATE_JWK` |
| `PRIVATE_JWK` của `program-service` | `program-service.env` → `SERVICE_TOKEN_PRIVATE_JWK` |
| `PRIVATE_JWK` của `identity-service` | `identity-service.env` → `JWT_SIGNING_KEYS='[<PRIVATE_JWK>]'` |
| `PUBLIC_JWK` của `web`, `admin`, `program-service` | `identity-service.env` → `SERVICE_TOKEN_TRUSTED_KEYS='{"web": …, "admin": …, "program-service": …}'` |
| `PUBLIC_JWK` của `web`, `admin` | `program-service.env` → `SERVICE_TOKEN_TRUSTED_KEYS='{"web": …, "admin": …}'` |
| `PUBLIC_JWK` của `program-service` | `content-service.env` → `SERVICE_TOKEN_TRUSTED_KEYS='{"program-service": …}'` |
| Một `RANDOM_32B` | `web.env` **và** `program-service.env` → `REVALIDATE_SECRET` (cùng giá trị) |
| Ba `RANDOM_32B` khác nhau | `identity-service.env` → `TOTP_ENCRYPTION_KEY`, `OTP_PEPPER`; `program-service.env` → `TICKET_LINK_SECRET` |

Khoá riêng (JWK có `"d"`) chỉ nằm ở **đúng một** tệp. **Dùng khoá mới cho production**, không dùng lại khoá dev.

### 4.2 Tạo các tệp trên máy chủ

```bash
cd /opt/lavieco/env
# Chép nội dung mẫu infra/env/prod/<tên>.env.example, điền giá trị:
nano web.env admin.env identity-service.env content-service.env program-service.env migrate.env backup.env
chmod 600 *.env

nano /opt/lavieco/compose.env      # theo infra/env/prod/compose.env.example
```

Giá trị phải trùng nhau giữa nhiều tệp:

- `REVALIDATE_SECRET`: `web` = `program-service`.
- `GOOGLE_CLIENT_ID`, `GOOGLE_REDIRECT_URI`: `web` = `identity-service`.
- `CLOUDINARY_CLOUD_NAME` (content-service) = biến repository `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` trên GitHub.
- **Toàn bộ khối mail** (`MAIL_*`, `BREVO_*`, `SMTP_*`): `identity-service` = `program-service`.

### 4.3 Email: Brevo chính, Gmail dự phòng (ADR-023)

Điền vào **cả hai** `identity-service.env` và `program-service.env`, giống hệt nhau:

| Biến | Lấy ở đâu |
|---|---|
| `BREVO_SMTP_USER`, `BREVO_SMTP_KEY` | Brevo > SMTP & API > SMTP: login dạng `...@smtp-brevo.com` và một SMTP key mới (không phải API key v3) |
| `BREVO_SMTP_HOST`, `BREVO_SMTP_PORT`, `BREVO_COOLDOWN_MINUTES` | Giữ như mẫu (`smtp-relay.brevo.com`, `587`, `15`) |
| `MAIL_FROM` | `"LAVIECO <no-reply@lavieco.io.vn>"` (tên miền đã xác minh trên Brevo) |
| `MAIL_FROM_FALLBACK` | `"LAVIECO <địa chỉ Gmail của SMTP_USER>"`. **Bắt buộc** khi có `BREVO_SMTP_KEY`, không được là `@lavieco.io.vn` |
| `MAIL_REPLY_TO` | Hộp thư đội đọc được |
| `SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE` | `smtp.gmail.com` / `587` / `false` |
| `SMTP_USER`, `SMTP_PASS` | Địa chỉ Gmail đó và App Password 16 ký tự |

Thiếu `MAIL_FROM_FALLBACK`, `MAIL_FROM_FALLBACK` cùng tên miền với `MAIL_FROM`, hoặc chỉ điền một nửa cặp user/key: service **từ chối khởi động** và log chỉ nêu tên biến. Thử từng đường sau khi stack chạy: §5.4.

---

## 5. Deploy lần đầu

### 5.1 GitHub: build image

1. **Settings → Secrets and variables → Actions → Variables** (công khai, nhúng vào bundle lúc build):
   - `NEXT_PUBLIC_SITE_URL` = `https://lavieco.io.vn`
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` = cloud name Cloudinary **production**
2. Push lên `main` (hoặc **Actions → Release → Run workflow**). Workflow đẩy 5 image `ghcr.io/vctrong/lavieco-<tên>:<sha>` (+ `:latest` khi là `main`). Đổi biến `NEXT_PUBLIC_*` thì phải build lại.
3. Package GHCR giữ **private** (ADR-022). VPS đăng nhập bằng một PAT (classic) **chỉ có quyền `read:packages`**, tạo riêng cho máy chủ này, đặt hạn dùng và ghi ngày hết hạn vào lịch của đội. Trên VPS, user `lavieco` (gõ PAT khi được hỏi, không đưa vào lịch sử shell):

   ```bash
   docker login ghcr.io -u <github-user>      # Password: <PAT>
   ```

   Thông tin đăng nhập lưu ở `~/.docker/config.json` của user `lavieco`. PAT hết hạn hoặc bị lộ: thu hồi trên GitHub, tạo PAT mới, đăng nhập lại.

### 5.2 Chép `infra/` lên máy chủ

Phải cùng commit với image sẽ chạy. Trên máy dev, sau khi `git checkout <sha>`:

```bash
rsync -az --delete infra/compose infra/caddy infra/deploy lavieco@<IP>:/opt/lavieco/infra/
ssh lavieco@<IP> "sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=<sha>/' /opt/lavieco/compose.env"
```

### 5.3 Bật stack từng bước

Trên máy chủ, user `lavieco`. Đường dẫn CLI trong container: thư mục làm việc là `/repo/services/<tên>`, nên mọi lệnh là `node dist/cli/<tệp>.js` (tương đương các script `npm run …` ở dev, nhưng không có `--env-file-if-exists=.env.local`: env đến từ `env_file`).

```bash
# 1. Pull image (cả image của profile migrate, cùng image với service). Lần đầu khoảng
#    1 GB qua băng thông quốc tế 10–20 Mbps: vài phút, nên pull trước giờ deploy.
lv --profile migrate pull

# 2. Migration từng service, bằng tài khoản migrator (migrate.env ghi đè MONGODB_URI).
#    Tương đương `node dist/cli/migrate.js` trong image của từng service.
lv --profile migrate run --rm --no-deps identity-migrate
lv --profile migrate run --rm --no-deps content-migrate
lv --profile migrate run --rm --no-deps program-migrate

# 3. Ba service, chờ healthy (/health/ready).
lv up -d --wait identity-service content-service program-service

# 4. web, admin, rồi caddy (xin chứng chỉ ở lần đầu: xem lv logs -f caddy).
lv up -d --wait web admin caddy
lv ps

curl -sI https://lavieco.io.vn | head -1
curl -sI https://admin.lavieco.io.vn/login | head -1
```

### 5.4 Việc làm một lần sau khi stack chạy

```bash
# Super Admin đầu tiên (npm run admin:create): in link kích hoạt một lần, bắt buộc cài 2FA.
lv run --rm --no-deps identity-service node dist/cli/create-super-admin.js --email <email> --name "<Họ tên>"

# Named transformations Cloudinary production (npm run media:setup, ADR-020).
lv run --rm --no-deps content-service node dist/cli/media-setup.js

# Webhook payOS (npm run payos:webhook). Cần web + caddy đang chạy: payOS gọi thử URL ngay.
lv run --rm --no-deps program-service node dist/cli/payos-webhook.js https://lavieco.io.vn/api/payments/payos/webhook

# Thử gửi email của cả hai service (npm run mail:test), từng đường một (ADR-023):
# --provider=brevo chỉ Brevo, --provider=gmail chỉ SMTP_*, bỏ trống (auto) = Brevo rồi Gmail.
for svc in identity-service program-service; do
  for p in brevo gmail; do
    lv run --rm --no-deps "$svc" node dist/cli/mail-test.js <email nhận thử> --provider=$p
  done
done
```

Các lệnh chạy bằng đúng image và tệp env đang dùng, không mang bí mật ra khỏi máy chủ. Thông báo lỗi của `mail-test` nhắc `.env.local` (viết cho dev); trên máy chủ, tệp cần sửa là `/opt/lavieco/env/<tên>.env`. Cả `brevo` và `gmail` phải báo "đã gửi"; kiểm tra thư Brevo có `spf=pass`, `dkim=pass` trong header. Sau khi đổi khối mail: `lv up -d --force-recreate identity-service program-service`.

Cuối cùng thử các luồng chính: đăng ký/đăng nhập member (OTP), đặt vé miễn phí, đặt vé có phí (đơn chỉ chuyển "đã thanh toán" nhờ webhook, BR-15), đăng nhập admin + 2FA, upload ảnh sự kiện 8 MB.

### 5.5 Google OAuth

Google Cloud Console → OAuth client *Web application* cho production: origin `https://lavieco.io.vn`, redirect `https://lavieco.io.vn/api/auth/google/callback`, consent screen *In production*. `GOOGLE_CLIENT_ID`/`GOOGLE_REDIRECT_URI` giống nhau ở `web.env` và `identity-service.env`; secret chỉ ở `identity-service.env`. Sau đó `lv up -d --force-recreate web identity-service`.

---

## 6. Cập nhật phiên bản

1. Merge vào `main` → workflow Release build image `<sha mới>`.
2. Chép `infra/` của commit đó lên máy chủ (§5.2).
3. Trên máy chủ:

   ```bash
   /opt/lavieco/infra/deploy/scripts/deploy.sh <sha mới>
   ```

   `deploy.sh`: pull 5 image → 3 container migrate → `up -d --remove-orphans --wait` (tối đa 300 giây) → thành công thì ghi `IMAGE_TAG` vào `compose.env` và thêm dòng vào `deployments.log`; thất bại thì dừng, không ghi log, in gợi ý rollback.

Migration luôn theo mẫu mở rộng → co lại, tương thích ngược ít nhất một phiên bản (`docs/03` §10.1), nên bản cũ vẫn chạy được trên schema mới.

Trong lúc `up` tạo lại container sẽ có vài giây gián đoạn (một instance mỗi thành phần, không rolling). Chọn giờ ít người dùng.

---

## 7. Rollback bằng `IMAGE_TAG`

Rollback = chạy lại một tag cũ; **không** đảo migration.

```bash
cat /opt/lavieco/deployments.log                       # các tag đã chạy thành công
/opt/lavieco/infra/deploy/scripts/rollback.sh          # tag thành công gần nhất trước tag hiện tại
/opt/lavieco/infra/deploy/scripts/rollback.sh <sha>    # một tag cụ thể
```

`rollback.sh` gọi `deploy.sh <sha> --skip-migrate`. Làm tay tương đương:

```bash
sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=<sha cũ>/' /opt/lavieco/compose.env
lv pull && lv up -d --wait
```

Nếu bản cũ cần `compose.prod.yml`/`Caddyfile` cũ, chép `infra/` của commit đó lên trước (§5.2). `deploy.sh` chỉ dọn image *dangling*, nên image các bản cũ vẫn còn trên máy; dọn bớt định kỳ bằng `docker image ls` / `docker image rm` (đĩa VPS nhỏ).

---

## 8. Backup

```bash
crontab -e     # user lavieco
0 19 * * * /opt/lavieco/infra/deploy/scripts/mongo-backup.sh >> /opt/lavieco/backups/backup.log 2>&1
```

19:00 UTC = 02:00 giờ Việt Nam. Dùng tài khoản `backup` (chỉ đọc) trong `backup.env`, giữ 14 ngày (`BACKUP_RETENTION_DAYS`). Script kéo image `mongo:8.0` (~800 MB đĩa) và giới hạn container 256 MB.

**Cần đội quyết:** nơi chép backup ra ngoài VPS (máy chủ là một điểm lỗi duy nhất, `docs/02` §12.2), mã hoá trước khi tải lên; thời hạn lưu backup chứa PII (AQ3/DQ1/DQ2, DQ8). Atlas M0 không có backup tự động.

Thử khôi phục định kỳ vào database tạm `*_restoretest` bằng một tài khoản tạm, **không** ghi đè dữ liệu thật; xoá database, tài khoản tạm và tệp env tạm sau khi kiểm tra.

---

## 9. Vận hành

```bash
lv ps                                  # trạng thái + health
lv logs -f --tail=200 web              # một container
lv logs --since=30m program-service
docker stats --no-stream               # RAM so với mem_limit
free -h                                # swap có bị dùng nhiều không
```

- Log JSON (pino), đã che PII. Docker giữ tối đa 5 × 10 MB mỗi container.
- Email (ADR-023): mỗi lần gửi có log `mail sent` với `provider` (`brevo`/`gmail`) và `durationMs`. `mail provider failed, falling back` (kèm `smtpCode`/`responseCode`) nghĩa là Brevo lỗi, email đã đi qua Gmail và Brevo bị bỏ qua `BREVO_COOLDOWN_MINUTES` phút; lặp lại nhiều lần trong ngày thường là hết hạn mức 300 email/ngày. `mail delivery failed` nghĩa là cả hai đường lỗi. Xem nhanh: `lv logs --since=24h identity-service program-service | grep -E 'mail (sent|provider failed|delivery failed)'`.
- Caddy **không** ghi access log (sẽ chứa IP và token trong `/ve/[token]`).
- Đổi tệp env phải tạo lại container: `lv up -d --force-recreate <tên>`.
- Container bị OOM-kill (`docker inspect -f '{{.State.OOMKilled}}' lavieco-<tên>-1` = `true`): nâng `mem_limit` **và** `--max-old-space-size` cùng lúc trong `compose.prod.yml`, giữ heap thấp hơn giới hạn ít nhất ~30%.
- Giám sát từ bên ngoài: dịch vụ uptime miễn phí gọi `https://lavieco.io.vn/icon.png` và `https://admin.lavieco.io.vn/login`.
