# CLAUDE.md: LAVIECO

Quy tắc làm việc cho Claude Code trong repo này. File này là **bản tóm tắt** của `docs/01`–`04` và được nạp ở mỗi phiên; chi tiết luôn nằm trong `docs/`. Giữ file này ngắn: đừng thêm nội dung dài vào đây, hãy đọc tài liệu gốc.

## 0. Thứ tự ưu tiên khi có mâu thuẫn

1. **Zod schema trong `packages/shared`** là nguồn sự thật cho hợp đồng và hình dạng dữ liệu.
2. **`docs/01` → `docs/04`** (nghiệp vụ → kiến trúc → dữ liệu → cấu trúc code). Tài liệu đánh số nhỏ hơn thắng khi nói về cùng một chủ đề.
3. File này (tóm tắt).

Nếu phát hiện hai nguồn nói khác nhau, hoặc tài liệu sai so với thực tế code: **dừng, nêu rõ chỗ lệch và hỏi lại**. Không âm thầm chọn một bên.

## 1. Dự án

LAVIECO là nền tảng số của thương hiệu **giáo dục mỹ thuật xanh** (vỏ hải sản → sản phẩm mỹ thuật + chương trình giáo dục). Website công khai + **Cẩm nang xanh số** đọc qua **mã QR** trên sản phẩm + thu thập liên hệ hợp tác + quản trị nội bộ. Đang ở **Giai đoạn 1**, giai đoạn dựng khung repo.

**Hai lớp giá trị (BR-01):** sản phẩm chỉ là *minh chứng*; thông điệp giáo dục đi trước. LAVIECO **không** phải cửa hàng đồ thủ công. Áp dụng cho mọi UI và nội dung bạn viết.

## 2. Đọc tài liệu nào khi nào

| Làm việc về... | Đọc |
|---|---|
| Hành vi, vai trò, use case, quy tắc nghiệp vụ, phân quyền | `docs/01-nghiep-vu.md` |
| Ranh giới service, luồng, bảo mật, xác thực, triển khai, CI | `docs/02-kien-truc.md` |
| Collection, trường, index, giao dịch, quyền riêng tư, migration | `docs/03-co-so-du-lieu.md` |
| Đặt file ở đâu, đặt tên, tầng trong service, công thức thêm tính năng/endpoint/service, lộ trình dựng khung | `docs/04-cau-truc-ma-nguon.md` |

Chỉ đọc **phần liên quan** (dùng mục lục), đừng nạp cả bốn file. Tên use case `UC-xx`, business rule `BR-xx` trỏ ngược về `docs/01`.

## 3. Trạng thái repo và bố cục project

Nếu thư mục/gói/lệnh được nhắc dưới đây **chưa tồn tại**, repo đang được dựng khung theo `docs/04` §15. Khi đó: làm đúng theo cấu trúc trong `docs/04` §2 và §6, **không tự sáng tạo cấu trúc khác**; nếu cần khác, hỏi trước.

**Bố cục project (L1–L7, `docs/04` §2.1):**

- **Mã nguồn của mỗi project (`apps/*`, `services/*`, `packages/*`, `e2e`) nằm gọn trong `src/`**, kể cả test (`*.spec.ts` cạnh mã; `src/test/` của service cho test tích hợp/hợp đồng; `e2e/src/`). Không tạo `app/`, `lib/`, `components/`, `modules/` ở gốc project.
- Ngoài `src/` chỉ có: cấu hình (`package.json`, `tsconfig*.json`, `next.config.ts`, `nest-cli.json`...), `public/` (chỉ app Next.js), `Dockerfile`, `.env.example`, `.env.local`, và **ngoại lệ duy nhất `migrations/`** của service.
- **`docs/` ở gốc repo** (tài liệu, `adr/`, `design/`, `brand/`, `runbooks/`, `api/`). Không đặt tài liệu trong `apps/`, `services/`, `packages/`.
- **`public/` ở gốc mỗi app Next.js**: chỉ cho **tài sản tĩnh cứng trong code** (logo, ảnh thành viên, hình trang trí, ảnh dự phòng) tại `public/images/{brand,team,illustrations,placeholders}/`. Ảnh do đội nội dung tải lên **không** để ở đây (đi qua `media`/object storage).
- **Next.js 16+ dùng `src/proxy.ts`** (cùng cấp `src/app/`, export hàm `proxy`). **Không tạo `middleware.ts`.**
- **`.env.local`** = giá trị thật của máy dev, **gitignore, không bao giờ commit/đọc/in**; `.env.example` là bản mẫu commit. Tạo bằng `npm run env:init`.

## 4. Lệnh (khi đã dựng khung)

| Lệnh | Việc |
|---|---|
| `npm run env:init` | Tạo `.env.local` từ `.env.example` cho mọi project (không ghi đè) |
| `npm run dev:infra` | MongoDB (replica set), MinIO, Mailpit bằng Docker |
| `npm run dev` | Chạy `web` (3000), `admin` (3001), identity (4001), content (4002), lead (4003) |
| `npm run lint` · `npm run typecheck` · `npm run deps:check` | Kiểm tra; `deps:check` thực thi ranh giới gói |
| `npm run test` · `npm run test:int` · `npm run e2e` | Đơn vị · tích hợp (MongoDB thật) · end-to-end |
| `npm run build` | Build (Turborepo cache) |
| `npm run db:migrate` · `npm run db:seed` | Migration · dữ liệu khởi tạo |
| `npm run gen` · `npm run gen:openapi` | Generator khung · sinh OpenAPI vào `docs/api/` |

Khi làm việc, **chạy có phạm vi** thay vì toàn bộ, ví dụ `npx turbo run test --filter=@lavieco/content-service`.

## 5. Kiến trúc: luật cứng

1. **5 thành phần GĐ1:** `apps/web`, `apps/admin` (Next.js) + `services/identity-service`, `content-service`, `lead-service` (NestJS). Không thêm service/gateway/broker khi chưa thỏa điều kiện ở `docs/02` §14.1 và chưa có ADR.
2. **Service không mở ra Internet.** Chỉ `web` và `admin` nhận lưu lượng ngoài. Trình duyệt **không bao giờ** gọi thẳng service; đi qua BFF (Route Handlers/Server Actions).
3. **Mỗi service một database** (`lavieco_identity` / `_content` / `_lead`), tài khoản DB riêng. **Cấm** đọc/ghi DB của service khác và cấm `$lookup` chéo DB. Tham chiếu chéo = ID + bản chụp (snapshot).
4. **Hướng phụ thuộc** (`docs/04` §4.1): apps → packages; services → packages; **không** apps ↔ services, **không** service → service (gọi nhau qua HTTP bằng `@lavieco/api-clients`).
5. **`packages/` chỉ chứa hợp đồng và công cụ**, không có logic nghiệp vụ: `shared`, `ui`, `api-clients`, `service-kit`, `observability`, `config`. Không thêm gói mới khi chưa có ≥2 nơi thật sự cần.
6. **Việc bất đồng bộ** (audit, email, làm mới cache, bản chụp QR) **ghi vào `outbox` trong cùng giao dịch** với dữ liệu chính. Không gọi dịch vụ ngoài bên trong giao dịch. Giao dịch chỉ trong **một** service.
7. **Giao tiếp:** REST `/internal/v1/<tài-nguyên>` (kebab-case, số nhiều); lỗi theo **Problem Details (RFC 9457)**; POST tạo lead nhận `Idempotency-Key`; phân trang theo con trỏ; thời gian ISO 8601 UTC; header `x-request-id` xuyên suốt.
8. **Xác thực:** admin dùng JWT bất đối xứng (JWKS từ identity) + **2FA TOTP bắt buộc**; `web` gọi service bằng **service token** ngắn hạn có `aud` đúng service đích. Quyền kiểm tra **ở service**, không chỉ ở giao diện.

## 6. Quy tắc nghiệp vụ không được vi phạm

| Mã | Quy tắc |
|---|---|
| BR-01 | Trang tác phẩm luôn có story card và liên kết về Cẩm nang; sản phẩm là minh chứng |
| BR-02 | **Mã QR bất biến**; đích đến đổi ở server; mã bị thu hồi hiện trang thân thiện, không lỗi kỹ thuật |
| BR-03 | Cẩm nang miễn phí lúc ra mắt nhưng nội dung có `accessLevel` ngay từ đầu |
| BR-04 | Không mất lead; không xóa cứng, chỉ lưu trữ |
| BR-05 | Nội dung: nháp → chờ duyệt → xuất bản; **người duyệt khác người soạn** |
| BR-06 | Mọi form có ô đồng ý (lưu phiên bản + thời điểm); thu tối thiểu; có quy trình xóa/xuất |
| BR-07 | Lead trùng (SĐT/email chuẩn hóa, trong cửa sổ thời gian) thì gộp, không tạo bản sao |
| BR-08 | **Không thu thông tin cá nhân học sinh**, chỉ số lượng |
| BR-09 | Số liệu tác động chỉ công bố khi có nguồn và được Super Admin duyệt |
| BR-10 | Giá công khai là **khoảng giá niêm yết**, giá chốt do đội xác nhận |
| BR-11 | Ghi chú cá nhân của người đọc chỉ chủ sở hữu thấy |

## 7. QR: quy tắc riêng (dễ làm sai nhất)

- URL trong QR: `https://<tên miền>/c/{code}`. Route `/c/[code]` nằm **ngoài** nhánh ngôn ngữ `[locale]`.
- Phản hồi phân giải là **`302`, tuyệt đối không `301`** (trình duyệt cache `301` gần như vĩnh viễn → không đổi đích được).
- `code`: 10 ký tự Crockford Base32, **ngẫu nhiên, không tuần tự**, **không bao giờ cập nhật** sau khi tạo.
- Phân giải trả `{ status, canonicalPath }` với `status` ∈ `ok` · `not_published` · `revoked` · `not_found`. Mọi trạng thái không `ok` → trang thân thiện. Chỉ trả nội dung **đã xuất bản**.
- Đếm lượt quét bằng `$inc` upsert vào `qr_scan_daily` theo `(code, day)`, `day` tính theo Asia/Ho_Chi_Minh. **Không lưu IP.**
- Mỗi thay đổi QR (tạo/đổi đích/thu hồi) → outbox `qr.snapshot` ghi bản chụp ánh xạ bất biến ra object storage.
- Lưu trữ nội dung đang có QR hoạt động trỏ tới: **cảnh báo và cần xác nhận**.

## 8. Frontend (`apps/web`, `apps/admin`)

- **`app/` mỏng**: chỉ định tuyến, ghép `features/*`. Không đặt logic/JSX phức tạp ở đó.
- **Cấu trúc theo tính năng** `features/<tên>/{components,constants,hooks,server,actions,schemas.ts,types.ts,index.ts}`:
  - F1: import tính năng khác/`app` **chỉ qua `index.ts`**. F2: tính năng **không import tính năng khác** (dùng chung → `@lavieco/ui` hoặc `src/shared/`). F3: chỉ `server/`, `actions/` được gọi `@lavieco/api-clients` và `lib/env`. F4: file `server/` bắt đầu bằng `import "server-only"`.
- **Chữ giao diện KHÔNG viết cứng trong JSX**: nằm ở `features/<tên>/constants/text.ts`, dạng `{ vi: {...} }` (sẵn sàng thêm `en`). Component đọc constants của chính tính năng, không truyền chữ xuống nhiều tầng props. **Nội dung biên tập** (cẩm nang, tác phẩm, trang giới thiệu) đến từ `content-service`; trang thiết yếu có bản chữ dự phòng trong constants.
- **Màu/font/bo góc chỉ từ design token** (`packages/ui/src/styles/theme.css`, Tailwind v4 `@theme`). Lớp token: `emerald-brand` `#10B183`, `mint-mist` `#EAF8F3`, `deep-blue` `#20345F`, `canary` `#E7DD6A`, `soft-white` `#F8FAF6`, `charcoal` `#1E2A32`. **Không hex rời, không `bg-[#...]`, không `style={{color:"#..."}}`.** Hex chỉ được ở `theme.css`.
- **Không sửa `globals.css` khi làm tính năng** (chỉ `@import` token). Muốn đổi token: PR riêng ở `packages/ui`.
- **Icon:** chỉ `react-icons/fi` (Feather), **không SVG inline cho icon**. Cần icon Feather không có: hỏi (PQ2), đừng tự thêm thư viện icon.
- **Font:** Fraunces (`--font-display`) + Be Vietnam Pro (`--font-sans`) qua `next/font`.
- **Cấm `dangerouslySetInnerHTML`.** Nội dung dạng khối được kết xuất bằng component.
- **Truy cập được:** `alt` bắt buộc; điều hướng bàn phím; **mọi hiệu ứng phải tắt/giảm khi `prefers-reduced-motion`**; Cẩm nang đọc được khi chưa chạy JS (hiệu ứng lật trang là lớp nâng cao).
- **Dữ liệu:** lấy ở `server/` qua `api-clients` → ánh xạ sang view model. Cache tag: `content:<thực-thể>` và `content:<thực-thể>:<slug|id>`; webhook `/api/revalidate` (HMAC) gọi `revalidateTag` đúng các tag này.
- **Form:** Zod ở client (trải nghiệm) **và** ở Route Handler (an toàn); sinh `Idempotency-Key` (UUID) khi mở form; Turnstile + honeypot.
- **Ghi chú/đánh dấu Cẩm nang (GĐ1):** IndexedDB sau module `features/handbook/storage`, ID UUID, `updatedAt`, xóa mềm. Không rải truy cập IndexedDB khắp nơi.
- **Env:** `NEXT_PUBLIC_*` là công khai (nhúng vào bundle lúc build), **không chứa bí mật**. Đọc env qua `lib/env.ts` (server) / `lib/env.public.ts`. Giá trị thật chỉ ở `.env.local`.
- **`src/proxy.ts`:** chỉ điều hướng và gắn header nhẹ. `web`: cổng "sắp ra mắt" (rewrite tới `/sap-ra-mat` khi cờ bật và không có Draft Mode), i18n nếu cần, header bảo mật. `admin`: chuyển hướng `/login` khi chưa có phiên, `noindex`, header bảo mật. **Không** logic nghiệp vụ, không DB, không gọi service nặng. **Không phải hàng rào bảo mật**: Route Handler/Server Action/service vẫn tự kiểm tra xác thực và quyền.
- **Ảnh tĩnh (`public/images/...`):** tên `kebab-case` không dấu (vd `team/vo-chi-trong.jpg`); đường dẫn khai báo ở constants (`src/shared/constants/assets.ts` hoặc `constants/` của tính năng), `alt` ở `text.ts`, không viết đường dẫn trong JSX; hiển thị bằng `next/image`; đổi ảnh thì đổi tên tệp. Favicon/OG/`robots`/`sitemap` dùng tệp quy ước trong `src/app/`, không để ở `public/`.
- **Đội ngũ là dữ liệu tĩnh:** `features/team/constants/members.ts` + `public/images/team/`, ghép vào trang chủ và trang Câu chuyện ở `app/`; **không** đưa vào CMS. Ảnh thành viên là dữ liệu cá nhân, chỉ dùng khi đã được đồng ý.

## 9. Backend (NestJS)

- **Bố cục module** `src/modules/<module>/{api,application/ports,domain,infrastructure,index.ts}`:
  - `api`: controller, xác thực đầu vào bằng Zod, `@RequirePermission(...)`. **Không** chứa quy tắc nghiệp vụ.
  - `application`: use case, ranh giới giao dịch, ghi outbox.
  - `domain`: quy tắc **thuần TypeScript** (máy trạng thái, người duyệt khác người soạn, điều kiện xuất bản, phát hiện trùng). **Không import Nest/Mongoose.**
  - `infrastructure`: model Mongoose, repository, client ngoài.
- S1: **chỉ `infrastructure` được import `mongoose`**; repository trả kiểu thuần, không trả tài liệu Mongoose. S2: module khác chỉ import `modules/<tên>/index.ts`. S3: truy vấn công khai có repository/projection riêng, **chỉ lấy `published`**. S4: mọi endpoint khai báo `@RequirePermission`; thiếu → từ chối mặc định. S6: lỗi nghiệp vụ là kiểu lỗi có mã (ở `shared`), không ném `HttpException` từ tầng dưới `api`. S7: log qua `@lavieco/observability`, **không PII**.
- **Permission** (`packages/shared/permissions`, kiểm tra permission chứ không kiểm tra tên vai trò): `content:read|write|publish`, `qr:read|manage`, `site:read|write|system`, `lead:read|write|export`, `user:read|manage`, `audit:read`, `privacy:process`. Vai trò & permission là **hằng số trong code**, không phải dữ liệu DB. Thêm permission: theo `docs/04` §13.5 và cập nhật `docs/01` §4.4 + `docs/02` §9.3.
- **Endpoint mới:** theo `docs/04` §13.2 (hợp đồng Zod trong `shared` trước → use case → repository → controller → test → `npm run gen:openapi` → thêm vào `api-clients`).
- **Không viết tay OpenAPI.** Sinh từ code.
- Controller chia theo người gọi: `*-public.controller.ts` (cho `web`, quyền tối thiểu) và `*-admin.controller.ts` (cho `admin`, token người dùng).

## 10. Dữ liệu (MongoDB)

- Collection `snake_case` số nhiều; trường `camelCase`; khóa ngoại kết thúc `Id`; enum chuỗi `snake_case` tiếng Anh; mọi tài liệu có `schemaVersion`, `createdAt`, `updatedAt`.
- **Thời gian UTC** (`Date`); chỉ trường `day` là chuỗi `YYYY-MM-DD` theo Asia/Ho_Chi_Minh. **Tiền = số nguyên đồng VND.** Văn bản đa ngôn ngữ: `LocalizedText = { vi, en? }`.
- **Mẫu publishable** (`handbook_chapters`, `works`, `program_pages`, `pages`): `status` (`draft|in_review|published|archived`), `live`, `revision`, `draft`, `published`, `review`. Xuất bản = sao chép `draft → published` nguyên tử + ghi `content_revisions` + outbox. **Endpoint công khai không được lộ `draft`/`review`/`editorIds`** (có test hợp đồng).
- **Trần nhúng:** ≤50 trang/chương, ≤200 khối/trang; `statusHistory` ≤100, `submissions` ≤20, `targetHistory` ≤20. Mảng nhúng luôn có trần.
- **Khóa lạc quan:** cập nhật kèm `{ _id, revision: n }` + `$inc: { revision: 1 }`; không khớp → `409`.
- **Xóa mềm/lưu trữ**, không xóa cứng (trừ yêu cầu xóa dữ liệu cá nhân và dữ liệu TTL).
- **Chuẩn hóa để so khớp:** `emailNormalized` (unique), `phoneNormalized` (E.164), `search.key` (chữ thường, bỏ dấu, `đ→d`).
- **Index:** khai báo trong code nhưng **tắt `autoIndex` ở production**; tạo qua migration; đặt tên `idx_<collection>_<trường>` (unique thêm `_uq`). Partial index không dùng `$ne` (dùng cờ `live`).
- **Migration** ở `services/<tên>/migrations/`, **idempotent**, theo mẫu mở rộng → co lại cho thay đổi phá vỡ. **Không sửa migration đã chạy.**
- **Bí mật trong DB:** chỉ lưu **băm** cho mật khẩu (Argon2id), refresh token, mã khôi phục 2FA, token mời. Bí mật TOTP mã hóa cấp ứng dụng. **Khóa ký JWT không nằm trong DB.**
- **`audit_events` chỉ thêm**, tài khoản DB chỉ `find`+`insert`. Ứng dụng **không** dùng vai trò `readWrite` dựng sẵn.
- `outbox.payload` **chỉ chứa ID, không chứa PII**.

## 11. Bảo mật & dữ liệu cá nhân: KHÔNG bao giờ

- **Không commit bí mật**, không đọc/in/ghi giá trị thật của `.env.local` và mọi `.env*` khác. Chỉ cập nhật `.env.example` (không giá trị thật) khi thêm biến. Không đưa `.env*` vào ảnh Docker.
- **Không ghi PII vào log/outbox/audit `meta`** (tên, SĐT, email, nội dung lời nhắn).
- **Không thêm trường dữ liệu học sinh** (BR-08).
- **Không nhận HTML thô** từ người dùng; **không nhận SVG do người dùng tải lên**; ảnh tải lên: kiểm tra loại theo nội dung thực, giới hạn dung lượng, **xóa EXIF**.
- **Không tạo mật khẩu/tài khoản mặc định** trong seed. Super Admin đầu tiên tạo bằng lệnh một lần và bắt buộc thiết lập 2FA.
- **Không mở cổng service ra ngoài** trong compose/staging/production.
- **Không tắt lint, hạ luật, bỏ qua test, thêm `any`, hoặc thêm `// eslint-disable`** để cho CI qua. Sửa nguyên nhân.
- **Không** `console.*` (dùng logger); **không** `process.env` ngoài `lib/env`/`config`.
- Thao tác nhạy cảm (xuất lead, đổi vai trò, thu hồi QR) cần **xác thực lại (step-up)** và **ghi audit**.

## 12. Quy ước code & Git

- **Ngôn ngữ:** code, tên biến, comment kỹ thuật, commit bằng **tiếng Anh**; chữ hiển thị cho người dùng bằng **tiếng Việt** (trong constants); **trả lời người dùng (con người) bằng tiếng Việt.**
- **Đặt tên:** file/thư mục `kebab-case`; component/class/kiểu `PascalCase` (không tiền tố `I`); hằng thật sự bất biến `UPPER_SNAKE_CASE`. **Không dùng `enum` của TS** (dùng `as const`/`z.enum`).
- **Hậu tố:** `*.module.ts` `*.controller.ts` `*.use-case.ts` `*.repository.ts` · **`*.model.ts` = Mongoose**, **`*.schema.ts` = Zod** · `*.constants.ts`/`text.ts` · `*.spec.ts` (đơn vị, cạnh mã) · `*.int-spec.ts` (tích hợp, `src/test/integration/`) · `*.e2e.ts` (`e2e/src/`).
- **Export:** named export; `default export` chỉ nơi Next.js bắt buộc. Alias `@/` trong ứng dụng; giữa gói dùng `@lavieco/*`; **cấm import sâu** vào `src/` của gói khác.
- **TypeScript nghiêm ngặt:** không `any` (dùng `unknown` rồi thu hẹp); mọi dữ liệu từ ngoài vào **phải qua Zod**.
- **Comment giải thích *vì sao***, kèm mã `// BR-05`, `// BR-02`... khi code thực thi quy tắc nghiệp vụ.
- **Commit:** Conventional Commits, phạm vi là tên gói/ứng dụng: `feat(content-service): ...`, `fix(web): ...`. Kiểu: `feat fix docs refactor test perf build ci chore revert`.
- **Nhánh:** `feat/<phạm-vi>-<mô-tả>`, `fix/...`; PR nhỏ, một mục đích, ghi `UC-`/`BR-` liên quan. **Không force-push `main`/`develop`.**

## 13. Kiểm thử bắt buộc

- **Domain:** máy trạng thái publishable; người duyệt ≠ người soạn; điều kiện xuất bản (BR-01); máy trạng thái lead; phát hiện trùng (BR-07).
- **Phân quyền:** bảng vai trò → permission khớp ma trận `docs/01` §4.4; mỗi endpoint từ chối khi thiếu permission.
- **Không rò rỉ bản nháp** ở mọi endpoint công khai.
- **QR:** đủ 4 trạng thái phân giải; `302`; `code` không sửa được; bộ đếm cộng dồn đúng.
- **Lead:** idempotency; giao dịch lead + outbox; ẩn danh hóa.
- **Bảo mật:** 2FA; xoay vòng refresh token và phát hiện dùng lại; từ chối token sai `aud`; PII không có trong log.
- **Hợp đồng:** phản hồi khớp schema trong `shared`.
- Test tích hợp dùng **MongoDB thật** (replica set); fixture **không dùng dữ liệu thật**.

## 14. Quy trình làm việc

1. **Đọc trước:** phần liên quan trong `docs/` + code hiện có. Với việc lặp lại, dùng công thức ở `docs/04` §13 (thêm tính năng FE, endpoint, service, collection/migration, permission, loại khối).
2. **Lập kế hoạch ngắn trước khi sửa** nếu thay đổi chạm hợp đồng (`shared`), schema DB, phân quyền, hoặc >3 file; chờ xác nhận khi có nhiều hướng hợp lý.
3. **Hợp đồng trước, cài đặt sau:** schema Zod → use case → repository → controller/UI.
4. **Thay đổi nhỏ, tập trung.** Không refactor lan man ngoài yêu cầu; không đổi định dạng/đặt tên hàng loạt.
5. **Kiểm chứng:** chạy `lint`, `typecheck`, `deps:check`, `test` (có phạm vi) và báo kết quả thật. **Không khẳng định "đã pass" nếu chưa chạy**; nếu không chạy được, nói rõ.
6. **Cập nhật tài liệu trong cùng thay đổi:** đổi hành vi → `docs/01`; đổi luồng/ranh giới → `docs/02`; đổi dữ liệu → `docs/03` (+ Zod); đổi cấu trúc/quy ước → `docs/04` **và file này**; OpenAPI sinh lại; `.env.example` nếu thêm biến.
7. **Không bịa:** chưa rõ thì hỏi, hoặc ghi `TODO(<mã>)` nếu thuộc danh sách mở ở mục 15 và dùng mặc định trong tài liệu khi an toàn.

## 15. Quyết định còn mở: đừng tự quyết

Dùng mặc định trong tài liệu nếu an toàn, ghi `TODO(<mã>)`, hoặc hỏi. **Không chọn thay đội.**

| Mã | Chủ đề |
|---|---|
| Q1 | Người soạn có được tự duyệt? (mặc định: **không**, BR-05) |
| Q2, Q3 | Tên gọi phụ của thương hiệu; có không gian trưng bày thật/đặt lịch tham quan |
| Q4, DQ4 | Bộ nhóm đối tác cuối cùng (2 form đang khác nhau); chợ đầu mối thuộc nhóm nào |
| Q5, DQ5 | Ý nghĩa `N°` (mã bộ sưu tập hay hàng độc bản) |
| Q7, Q8, Q9 | Cam kết thời gian phản hồi lead; công khai bảng giá chương trình; cơ chế tích điểm |
| AQ1 | Phương án hosting và ngân sách (mặc định đề xuất: một máy chủ + Docker Compose + Cloudflare) |
| AQ2 | Email dự phòng khi `lead-service` lỗi (chứa PII) có chấp nhận không |
| AQ3, DQ1, DQ2 | Thời hạn lưu giữ lead / audit |
| AQ4 | Yêu cầu lưu trữ dữ liệu trong nước (cần tham vấn pháp lý) |
| AQ5 | Tên miền chính thức và người đứng tên |
| AQ6, AQ7, AQ8 | Người quản trị hạ tầng; IP allowlist/Cloudflare Access cho admin; nhà cung cấp email |
| DQ3, DQ6, DQ7 | Xác nhận email 2 bước cho danh sách chờ; cửa sổ phát hiện trùng lead (mặc định 30 ngày, cấu hình được); nhập/xuất lead hàng loạt |
| PQ1–PQ6 | Xác nhận quy ước kế thừa; ngoại lệ icon; chiến lược URL/ngôn ngữ; Testcontainers hay memory-server; thư viện trình soạn khối (ADR-008); công cụ generator |

## 16. Không làm

- Không tạo `middleware.ts`; không đặt mã nguồn ngoài `src/` (trừ `migrations/`); không để ảnh do người dùng tải lên trong `public/`.
- Không thêm thư viện/phụ thuộc mới khi chưa cần thật sự và chưa có ADR nếu ảnh hưởng kiến trúc (state toàn cục, thư viện UI, ORM khác, broker...).
- Không đưa logic nghiệp vụ vào `packages/`; không tạo `utils/`, `helpers/`, `common/` toàn cục làm chỗ chứa.
- Không sửa tay tệp sinh tự động (`docs/api/*.openapi.json`).
- Không gọi service khác bằng import mã; không dùng `$lookup` chéo DB; không thêm khóa ngoại ngầm giữa các database.
- Không thêm API Gateway, message broker, Redis, Kubernetes ở GĐ1.
- Không đổi/chạy lại logic phá vỡ hợp đồng mà không tạo `v2` song song.

## 17. Định nghĩa "xong" cho một thay đổi

- [ ] Đúng vị trí và tầng theo `docs/04`; mã nằm trong `src/`; `npm run deps:check` xanh.
- [ ] Có hợp đồng Zod trong `shared` (nếu đụng API/dữ liệu); OpenAPI đã sinh lại.
- [ ] Endpoint có `@RequirePermission`; quyền khớp `docs/01` §4.4.
- [ ] Có test đúng tầng (đơn vị/tích hợp/hợp đồng); test bắt buộc ở mục 13 nếu liên quan.
- [ ] Không có hex rời, chữ cứng trong JSX, `console.*`, `any`, PII trong log.
- [ ] Đã chạy `lint` + `typecheck` + `test` có phạm vi, và báo kết quả thật.
- [ ] Đã cập nhật tài liệu (`docs/0x`, `CLAUDE.md`, `.env.example`) trong cùng thay đổi.
- [ ] Commit theo Conventional Commits, phạm vi đúng.