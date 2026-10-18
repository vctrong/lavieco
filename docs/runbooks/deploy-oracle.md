# Runbook: deploy production trên Oracle Cloud

Áp dụng cho phương án B trong `docs/02` §12.2, chi tiết ở **ADR-022 (đang ở trạng thái Đề xuất)**: một máy ảo Oracle Cloud Ampere A1 (linux/arm64, Ubuntu, Singapore) chạy Docker Compose, có Cloudflare phía trước, dữ liệu trên MongoDB Atlas Singapore.

Các tệp liên quan:

| Tệp | Vai trò |
|---|---|
| `infra/compose/compose.prod.yml` | Stack production: caddy, web, admin, 3 service; profile `migrate`, `mongo` |
| `infra/caddy/Caddyfile` | Định tuyến `lavieco.io.vn` → web, `admin.lavieco.io.vn` → admin; Origin Certificate; IP thật từ Cloudflare |
| `infra/deploy/env/*.env.example` | Mẫu tệp env cho từng container (chỉ tên biến) |
| `infra/deploy/compose.env.example` | Biến của chính compose (`GHCR_OWNER`, `IMAGE_TAG`…) |
| `infra/deploy/scripts/{deploy,rollback,mongo-backup}.sh` | Chạy trên máy chủ |
| `.github/workflows/deploy.yml` | Build 5 image arm64 → GHCR → SSH deploy |

Bố cục trên máy chủ (không nằm trong repo, trừ `infra/` được workflow đồng bộ):

```
/opt/lavieco/
  compose.env            biến của compose (không bí mật)
  deployments.log        lịch sử tag đã deploy thành công (deploy.sh ghi)
  infra/                 compose/, caddy/, deploy/  ← rsync từ repo mỗi lần deploy
  env/                   web.env, admin.env, identity-service.env, content-service.env,
                         program-service.env, migrate.env, backup.env (+ mongo.env nếu dùng)
  certs/                 origin.pem, origin.key (Cloudflare Origin Certificate)
  backups/               bản mongodump
```

Để gõ lệnh ngắn hơn, thêm alias vào `~/.bashrc` của user deploy:

```bash
alias lv='docker compose --env-file /opt/lavieco/compose.env -f /opt/lavieco/infra/compose/compose.prod.yml'
```

**Quy tắc chung:** không dán giá trị bí mật vào chat, issue, PR hay commit. Tệp env chỉ nằm trên máy chủ (chmod 600) và trong trình quản lý mật khẩu của đội.

---

## 1. Chuẩn bị máy chủ

### 1.1 Tạo máy ảo (Oracle Cloud Console)

1. **Networking → Virtual Cloud Networks:** tạo VCN với public subnet (dùng wizard "VCN with Internet Connectivity").
2. **Compute → Instances → Create:**
   - Image: **Canonical Ubuntu 24.04 (aarch64)**.
   - Shape: **VM.Standard.A1.Flex** (Ampere). Gói Always Free cho tổng cộng 4 OCPU / 24 GB RAM. Stack này cần khoảng 4,5 GB RAM theo giới hạn trong compose, nên **2 OCPU / 12 GB** là đủ dư.
   - Tải lên khoá SSH công khai **của quản trị viên** (khác với khoá deploy ở §5.1).
   - Boot volume: 50–100 GB (Always Free cho tổng 200 GB).
3. **Reserved Public IP:** chuyển IP công khai của máy sang loại *reserved*, để IP không đổi khi tạo lại máy. Atlas (§3) và Cloudflare (§2) đều dùng IP này.
4. Nếu capacity A1 ở Singapore báo hết ("Out of host capacity"), thử lại sau hoặc đổi availability domain.

> **Rủi ro Always Free:** Oracle có thể thu hồi máy ảo Always Free khi nó "nhàn rỗi" lâu ngày. Nâng tài khoản lên **Pay As You Go** (vẫn dùng tài nguyên miễn phí, đặt giới hạn ngân sách) để tránh bị thu hồi. Đội cần quyết định (ADR-022).

### 1.2 Tường lửa ở tầng cloud (Security List hoặc NSG)

Đây là lớp chặn chính, vì Docker có thể đi vòng qua tường lửa bên trong hệ điều hành.

| Hướng | Giao thức/cổng | Nguồn |
|---|---|---|
| Ingress | TCP 22 | **Chỉ IP của quản trị viên**. GitHub Actions cũng cần SSH: xem ghi chú bên dưới |
| Ingress | TCP 80, 443 | **Từng dải IP của Cloudflare** (https://www.cloudflare.com/ips/, cùng danh sách với `trusted_proxies` trong `Caddyfile`) |
| Egress | Tất cả | 0.0.0.0/0 (Atlas, SMTP, Cloudinary, payOS, GHCR) |

> Runner GitHub-hosted không có IP cố định, nên job deploy cần cổng 22 mở rộng hơn. Có ba cách:
> - mở 22 cho `0.0.0.0/0`, chỉ cho đăng nhập bằng khoá và bật fail2ban;
> - dùng Cloudflare Tunnel hoặc Tailscale cho SSH;
> - dùng self-hosted runner.
>
> **Đây là quyết định của đội**, workflow hiện giả định cổng 22 truy cập được.

### 1.3 Hệ điều hành

```bash
sudo apt update && sudo apt -y full-upgrade
sudo apt -y install unattended-upgrades rsync fail2ban
sudo dpkg-reconfigure -plow unattended-upgrades

# Ảnh Ubuntu của Oracle có sẵn luật iptables chặn mọi cổng trừ 22: mở 80/443.
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

# SSH chỉ bằng khoá.
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl reload ssh

# Swap 2 GB phòng lúc build/peak.
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Kiểm tra lại vị trí dòng `REJECT` bằng `sudo iptables -L INPUT --line-numbers`. Luật ACCEPT phải đứng **trước** dòng REJECT.

### 1.4 Docker Engine (arm64)

Cài theo hướng dẫn chính thức "Install Docker Engine on Ubuntu" (apt repository `download.docker.com`), gồm `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-buildx-plugin`, `docker-compose-plugin`. Kiểm tra:

```bash
docker version --format '{{.Server.Arch}}'   # arm64
docker compose version
```

### 1.5 User deploy và thư mục

```bash
sudo adduser --disabled-password --gecos "" lavieco
sudo usermod -aG docker lavieco          # lưu ý: nhóm docker tương đương quyền root
sudo mkdir -p /opt/lavieco/{infra,env,certs,backups}
sudo chown -R lavieco:lavieco /opt/lavieco
sudo chmod 700 /opt/lavieco/env /opt/lavieco/certs /opt/lavieco/backups
```

---

## 2. Cloudflare: DNS và SSL

Điều kiện: tên miền `lavieco.io.vn` đã dùng nameserver của Cloudflare (người đứng tên miền: AQ5).

1. **DNS → Records:** tạo 3 bản ghi `A`, trỏ tới IP reserved ở §1.1, tất cả bật **Proxied** (mây cam):
   - `lavieco.io.vn`
   - `www`
   - `admin`
2. **SSL/TLS → Overview:** chọn **Full (strict)**.
3. **SSL/TLS → Origin Server → Create Certificate:**
   - Hostnames: `lavieco.io.vn`, `*.lavieco.io.vn`. Loại khoá RSA (hoặc ECC). Thời hạn tối đa.
   - Lưu thành 2 tệp **trên máy chủ**, không lưu trong repo (`.gitignore` đã chặn `*.pem`, `*.key`):
     ```bash
     nano /opt/lavieco/certs/origin.pem    # dán "Origin Certificate"
     nano /opt/lavieco/certs/origin.key    # dán "Private Key" (Cloudflare chỉ hiện một lần)
     chmod 600 /opt/lavieco/certs/*
     ```
4. **SSL/TLS → Edge Certificates:** bật *Always Use HTTPS*, đặt *Minimum TLS Version* = 1.2.
5. **(Khuyên dùng) Authenticated Origin Pulls:** chỉ chấp nhận kết nối có chứng chỉ client của Cloudflare. Muốn bật thì phải thêm `client_auth` vào Caddyfile; chưa làm, cần đội quyết.
6. **Security → WAF → Custom rules:** tạo rule *Skip* (bỏ qua Bot Fight Mode / Super Bot Fight / challenge) cho hai đường dẫn:
   - `/api/payments/payos/webhook`: payOS gọi từ máy chủ của họ.
   - `/api/revalidate`: `program-service` gọi qua `WEB_APP_URL` công khai.

   Nếu không có rule này, hai lời gọi trên có thể bị chặn hoặc bị challenge.
7. **Turnstile:** widget production với hostname `lavieco.io.vn`. Site key và secret key điền vào `web.env`.
8. **Bảo vệ thêm cho `admin`** (Cloudflare Access hoặc danh sách IP) là **AQ7, còn mở**. Nếu đội bật Access, mọi request vào `admin.lavieco.io.vn` sẽ qua đăng nhập Cloudflare trước.

Dải IP Cloudflare thỉnh thoảng thay đổi. Khi đó cập nhật **cả hai nơi**: Security List (§1.2) và `trusted_proxies` trong `infra/caddy/Caddyfile`.

---

## 3. MongoDB Atlas

1. Tạo project, rồi tạo cluster **AWS Singapore (ap-southeast-1)**.
   - Tier M0 (miễn phí) **không có backup tự động**, giới hạn dung lượng và kết nối. Trước khi chọn, kiểm tra các giới hạn của M0 (custom role, transaction).
   - Transaction cần replica set; mọi cluster Atlas đều là replica set.
2. **Database Access:** tạo tài khoản theo `docs/03` §10.3. Mỗi tài khoản một mật khẩu ngẫu nhiên riêng.

   | Tài khoản | Quyền | Dùng ở |
   |---|---|---|
   | `svc_identity` | Custom role: `find`, `insert`, `update`, `remove` trên `lavieco_identity`; `audit_events` chỉ `find` + `insert` | `identity-service.env` |
   | `svc_content` | Custom role: `find`, `insert`, `update`, `remove` trên `lavieco_content` | `content-service.env` |
   | `svc_program` | Custom role: `find`, `insert`, `update`, `remove` trên `lavieco_program` | `program-service.env` |
   | `migrator` | Tạo/sửa index và collection trên 3 database | `migrate.env` |
   | `backup` | Chỉ đọc trên 3 database | `backup.env` |

   > Quyền tối thiểu của custom role **chưa được thử với ứng dụng thật**. Sau lần deploy đầu, nếu service log lỗi `not authorized`, bổ sung đúng action còn thiếu. Không đổi sang `readWrite`.
3. **Network Access:** chỉ thêm IP reserved của máy chủ (§1.1). Không dùng `0.0.0.0/0`.
4. Connection string dạng `mongodb+srv://<user>:<password>@<cluster>/`. `MONGODB_DB` nằm riêng trong tệp env (`lavieco_identity`…). Production **không** bao giờ dùng database có hậu tố `_dev`; service sẽ từ chối khởi động.

---

## 4. Sinh khoá và điền tệp env

Ý nghĩa từng biến: `docs/06-bien-moi-truong.md`. Các mẫu ở `infra/deploy/env/` đã ghi rõ biến nào phải khớp với biến nào.

### 4.1 Sinh khoá service token và giá trị ngẫu nhiên

Chạy trên máy dev, ở gốc repo. Lệnh chỉ in ra màn hình, không ghi tệp:

```bash
npm run keys:generate -- web
npm run keys:generate -- admin
npm run keys:generate -- program-service
npm run keys:generate -- identity-service    # khoá ký token người dùng
```

Mỗi lần chạy in ra `PRIVATE_JWK`, `PUBLIC_JWK`, `RANDOM_32B_1`, `RANDOM_32B_2`. Điền vào các tệp env như sau. Giá trị JSON phải bọc trong **dấu nháy đơn**.

| Giá trị | Điền vào |
|---|---|
| `PRIVATE_JWK` của `web` | `web.env` → `SERVICE_TOKEN_PRIVATE_JWK` |
| `PRIVATE_JWK` của `admin` | `admin.env` → `SERVICE_TOKEN_PRIVATE_JWK` |
| `PRIVATE_JWK` của `program-service` | `program-service.env` → `SERVICE_TOKEN_PRIVATE_JWK` |
| `PRIVATE_JWK` của `identity-service` | `identity-service.env` → `JWT_SIGNING_KEYS='[<PRIVATE_JWK>]'` |
| `PUBLIC_JWK` của `web`, `admin`, `program-service` | `identity-service.env` → `SERVICE_TOKEN_TRUSTED_KEYS='{"web": …, "admin": …, "program-service": …}'` |
| `PUBLIC_JWK` của `web`, `admin` | `program-service.env` → `SERVICE_TOKEN_TRUSTED_KEYS='{"web": …, "admin": …}'` |
| `PUBLIC_JWK` của `program-service` | `content-service.env` → `SERVICE_TOKEN_TRUSTED_KEYS='{"program-service": …}'` |
| Một giá trị `RANDOM_32B` | `web.env` **và** `program-service.env` → `REVALIDATE_SECRET` (cùng một giá trị) |
| Ba giá trị `RANDOM_32B` khác nhau | `identity-service.env` → `TOTP_ENCRYPTION_KEY`, `OTP_PEPPER`; `program-service.env` → `TICKET_LINK_SECRET` |

Khoá riêng (JWK có trường `"d"`) chỉ nằm ở **đúng một** tệp. Service từ chối khởi động nếu `SERVICE_TOKEN_TRUSTED_KEYS` chứa khoá riêng.

**Phải dùng khoá mới cho production**, không dùng lại khoá của dev. Lưu bản sao các tệp env trong trình quản lý mật khẩu của đội; không lưu ở nơi nào khác.

### 4.2 Tạo các tệp trên máy chủ

```bash
cd /opt/lavieco/env
# Mở mẫu trong repo (infra/deploy/env/<tên>.env.example), chép nội dung, điền giá trị:
nano web.env admin.env identity-service.env content-service.env program-service.env migrate.env backup.env
chmod 600 *.env

# Biến của compose:
nano /opt/lavieco/compose.env      # theo infra/deploy/compose.env.example (GHCR_OWNER=vctrong)
```

Các giá trị phải trùng nhau giữa nhiều tệp:

- `REVALIDATE_SECRET`: `web` = `program-service`.
- `GOOGLE_CLIENT_ID`, `GOOGLE_REDIRECT_URI`: `web` = `identity-service`.
- `CLOUDINARY_CLOUD_NAME` (content-service) = biến repository `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` trên GitHub.

---

## 5. Deploy lần đầu

### 5.1 GitHub

1. **Settings → Secrets and variables → Actions → Variables** (công khai, được nhúng vào bundle):
   - `NEXT_PUBLIC_SITE_URL` = `https://lavieco.io.vn`
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` = cloud name của Cloudinary **production**
2. **Settings → Environments → New environment `production`:**
   - Bật *Required reviewers* (bước phê duyệt của `docs/02` §12.4).
   - Thêm secrets:
     - `DEPLOY_HOST`: IP reserved hoặc hostname SSH (không qua Cloudflare).
     - `DEPLOY_USER`: `lavieco`.
     - `DEPLOY_SSH_KEY`: khoá **riêng** của một cặp ed25519 dành riêng cho deploy (`ssh-keygen -t ed25519 -C github-deploy -f deploy_key`). Khoá công khai thêm vào `/home/lavieco/.ssh/authorized_keys`. Xoá tệp khoá trên máy dev sau khi đã dán.
     - `DEPLOY_KNOWN_HOSTS`: kết quả `ssh-keyscan -t ed25519 <IP>`. Đối chiếu fingerprint với `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` chạy trên máy chủ.
3. Repo đang **public**, nên dùng được runner `ubuntu-24.04-arm` miễn phí. Nếu sau này repo chuyển sang private, kiểm tra lại xem gói GitHub có runner arm64 không. Nếu không có, đổi job `build` sang `ubuntu-24.04` + `docker/setup-qemu-action`; khi đó build **chậm hơn nhiều** (Next.js qua QEMU mất hàng chục phút).

### 5.2 Chạy

1. **Actions → Deploy → Run workflow** trên `main`, để trống `image_tag`. Cách khác: tạo tag `v0.1.0` rồi push tag.
2. Job `build` đẩy 5 image `ghcr.io/vctrong/lavieco-<tên>:<sha>`. Job `deploy` chờ duyệt, sau đó:
   - rsync `infra/` lên máy chủ;
   - đăng nhập GHCR bằng token của job;
   - chạy `deploy.sh <sha>`: pull → 3 container migrate → `up -d --wait` → ghi `deployments.log`.
3. Kiểm tra trên máy chủ:
   ```bash
   lv ps                                   # mọi container "healthy"
   curl -sI https://lavieco.io.vn | head -1
   curl -sI https://admin.lavieco.io.vn/login | head -1
   ```

### 5.3 Việc làm một lần sau lần deploy đầu

```bash
# Super Admin đầu tiên: in link kích hoạt một lần, bắt buộc cài 2FA.
lv run --rm --no-deps identity-service node dist/cli/create-super-admin.js --email <email> --name "<Họ tên>"

# Named transformations của Cloudinary production (ADR-020).
lv run --rm --no-deps content-service node dist/cli/media-setup.js
```

Hai lệnh chạy bằng image và tệp env đang dùng, nên không cần mang bí mật ra khỏi máy chủ.

Cuối cùng, thử các luồng chính: đăng ký/đăng nhập member (OTP email), đặt vé miễn phí, đặt vé có phí (§7), đăng nhập admin, upload ảnh sự kiện.

### 5.4 Deploy các lần sau

- Merge vào `main`, sau đó **Run workflow** (hoặc push tag `v*`), rồi duyệt.
- Migration luôn theo mẫu mở rộng → co lại và tương thích ngược ít nhất một phiên bản (`docs/03` §10.1). Nhờ vậy rollback (§8) không cần đảo migration.

---

## 6. Script deploy trên máy chủ

`deploy.sh <tag> [--skip-migrate]` có thể chạy tay. Trước đó phải `docker login ghcr.io`, bằng một PAT chỉ có quyền `read:packages`, hoặc chuyển package GHCR sang public. Script làm theo thứ tự:

1. Pull image của tag.
2. Chạy `identity-migrate`, `content-migrate`, `program-migrate`. Mỗi container dùng tệp env của service, cộng `migrate.env` để đổi sang tài khoản `migrator`.
3. `up -d --remove-orphans --wait`, chờ tối đa 300 giây đến khi mọi container healthy.
4. Thành công thì ghi `IMAGE_TAG` vào `compose.env` và thêm một dòng vào `deployments.log`. Thất bại thì dừng, **không** ghi log, và in gợi ý rollback.

---

## 7. payOS và Google OAuth

### 7.1 Đăng ký webhook payOS

Cần cấu hình Cloudflare §2.6 và có `PAYOS_*` của kênh **production** trong `program-service.env`. Sau đó chạy trên máy chủ:

```bash
lv run --rm --no-deps program-service node dist/cli/payos-webhook.js https://lavieco.io.vn/api/payments/payos/webhook
```

payOS sẽ gọi thử URL. `web` chỉ chuyển raw body sang `program-service`, và service kiểm tra chữ ký bằng `PAYOS_CHECKSUM_KEY` (ADR-015). Chi tiết kênh dev/prod ở `docs/runbooks/payos.md`. Thử một giao dịch nhỏ thật, rồi kiểm tra đơn chuyển sang "đã thanh toán" chỉ nhờ webhook (BR-15).

### 7.2 Google OAuth

Google Cloud Console → **APIs & Services → Credentials** → OAuth client (loại *Web application*) dành cho production:

- *Authorized JavaScript origins*: `https://lavieco.io.vn`
- *Authorized redirect URIs*: `https://lavieco.io.vn/api/auth/google/callback`
- *OAuth consent screen*: chuyển sang *In production*, đặt domain `lavieco.io.vn`.

Điền `GOOGLE_CLIENT_ID` và `GOOGLE_REDIRECT_URI` giống nhau ở `web.env` và `identity-service.env`; `GOOGLE_CLIENT_SECRET` chỉ ở `identity-service.env`. Khởi động lại hai container: `lv up -d --force-recreate web identity-service`.

---

## 8. Rollback

Rollback = chạy lại một **tag image cũ**. Migration không bị đảo ngược.

- **Qua GitHub:**
  - Mở Actions → Deploy → Run workflow.
  - Ô *Use workflow from*: chọn commit hoặc tag ứng với bản cũ, để `infra/` khớp với image.
  - Ô `image_tag`: SHA cũ (lấy ở `/opt/lavieco/deployments.log` hoặc trong danh sách package GHCR).
  - Job `build` được bỏ qua.
- **Trực tiếp trên máy chủ** (nhanh nhất khi sự cố, image cũ vẫn còn trên máy):
  ```bash
  /opt/lavieco/infra/deploy/scripts/rollback.sh          # tag thành công gần nhất trước tag hiện tại
  /opt/lavieco/infra/deploy/scripts/rollback.sh <sha>    # một tag cụ thể
  ```

Sau khi rollback, kiểm tra `lv ps` và các luồng ở §5.3. `deploy.sh` chỉ dọn image *dangling*, nên image của các bản cũ vẫn còn trên máy để rollback; thỉnh thoảng dọn bớt bằng `docker image ls` / `docker image rm`.

---

## 9. Backup

### 9.1 mongodump hằng ngày

```bash
crontab -e     # user lavieco
0 19 * * * /opt/lavieco/infra/deploy/scripts/mongo-backup.sh >> /opt/lavieco/backups/backup.log 2>&1
```

19:00 UTC = 02:00 giờ Việt Nam. Script dùng tài khoản `backup` (chỉ đọc) trong `backup.env`, lưu `lavieco-<thời điểm>.archive.gz` vào `/opt/lavieco/backups` và xoá bản cũ hơn 14 ngày (đặt `BACKUP_RETENTION_DAYS` để đổi).

**Còn phải làm (cần đội quyết):**

- **Chép backup ra ngoài máy chủ.** Máy chủ là một điểm lỗi duy nhất (`docs/02` §12.2). Có thể dùng Oracle Object Storage (Always Free 20 GB) với `rclone` hoặc `oci os object put`, và nên mã hoá trước khi tải lên.
- **Thời hạn lưu backup:** backup chứa PII của người đặt vé và member, gắn với AQ3/DQ1/DQ2 và DQ8.
- Atlas M0 **không** có backup tự động. Nếu nâng lên M10 trở lên, bật Cloud Backup và vẫn giữ mongodump làm bản thứ hai.

### 9.2 Thử khôi phục (định kỳ, ví dụ mỗi quý)

Khôi phục vào database tạm, **không** ghi đè dữ liệu thật:

1. Tạo một tài khoản tạm chỉ có quyền ghi vào `lavieco_program_restoretest`.
2. Ghi URI của tài khoản đó vào `/opt/lavieco/env/restore.env` (`RESTORE_MONGODB_URI=…`, chmod 600).
3. Chạy:

```bash
docker run --rm -i --network lavieco_backend --env-file /opt/lavieco/env/restore.env mongo:8.0 \
  sh -c 'mongorestore --uri="$RESTORE_MONGODB_URI" --archive --gzip \
         --nsInclude "lavieco_program.*" \
         --nsFrom "lavieco_program.*" --nsTo "lavieco_program_restoretest.*"' \
  < /opt/lavieco/backups/lavieco-<thời điểm>.archive.gz
```

4. Kiểm tra số tài liệu.
5. Xoá database `*_restoretest`, tài khoản tạm và tệp `restore.env`.

### 9.3 Profile `mongo` (MongoDB tự host, mặc định tắt)

Chỉ dùng khi đội quyết định không dùng Atlas:

1. Điền `mongo.env`, thêm `COMPOSE_PROFILES=mongo` vào `compose.env`, chạy `lv up -d mongo`. Container tự tạo keyfile và khởi tạo replica set `rs0`.
2. Dùng tài khoản root tạo các tài khoản như bảng ở §3 (custom role theo `docs/03` §10.3):
   ```bash
   lv exec mongo mongosh -u <root> -p --authenticationDatabase admin
   ```
3. URI của service có dạng `mongodb://svc_identity:<password>@mongo:27017/?replicaSet=rs0&authSource=admin`.
4. Dữ liệu nằm trong volume `lavieco_mongo-data`. Backup bằng §9.1, với `BACKUP_MONGODB_URI` trỏ tới `mongo:27017`.

Các service không `depends_on` mongo (vì profile tuỳ chọn). Lần đầu, chúng có thể khởi động lại vài lần cho đến khi mongo sẵn sàng.

---

## 10. Xem log và vận hành

```bash
lv ps                                  # trạng thái + health
lv logs -f --tail=200 web              # một container (web, admin, identity-service, …)
lv logs --since=30m program-service
docker inspect --format '{{json .State.Health}}' lavieco-web-1
docker stats --no-stream               # RAM/CPU so với giới hạn trong compose
cat /opt/lavieco/deployments.log       # tag đã deploy
```

- Log dạng JSON (pino), đã che PII (`@lavieco/observability`). Docker giữ tối đa 5 × 10 MB cho mỗi container (`json-file`), không cần cấu hình logrotate.
- Caddy **không** ghi access log: access log sẽ chứa IP người dùng và token trong URL `/ve/[token]`. Lỗi của Caddy vẫn xuất hiện trong `lv logs caddy`.
- Khởi động lại một container: `lv restart web`. Đổi tệp env thì phải tạo lại container: `lv up -d --force-recreate <tên>`.
- Đổi chứng chỉ origin: thay tệp trong `/opt/lavieco/certs`, rồi `lv restart caddy`.
- Giám sát từ bên ngoài (đề xuất trong `docs/02` §12.2): dùng dịch vụ uptime miễn phí gọi `https://lavieco.io.vn/icon.png` và `https://admin.lavieco.io.vn/login`.
