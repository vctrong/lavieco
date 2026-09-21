# Prompt cho Claude Code: triển khai landing page LAVIECO vào `apps/web`

> **Cách dùng:** mở Claude Code ở gốc repo `lavieco-app`, dán toàn bộ nội dung từ mục "Nhiệm vụ" trở xuống. Hoặc lưu file này vào `docs/design/landing-page/` rồi gõ: `Làm theo docs/design/landing-page/prompt-trien-khai-landing.md`.

---

## Nhiệm vụ

Hiện thực hóa **landing page LAVIECO (trang chủ `/` của `apps/web`)** từ bản thiết kế đã chốt, **đúng quy ước của repo**. Bản thiết kế là prototype HTML tĩnh dùng Tailwind CDN. Hãy dựng lại thành code Next.js sản phẩm, **không copy nguyên HTML**.

Có hai việc cần chú ý hơn phần còn lại:
1. **Navbar** trong ảnh mẫu chưa đầy đủ và chưa tối ưu. Hãy hoàn thiện theo mục 5.
2. **Dải chữ chạy "LIFE ✦ ART ✦ VALUE ✦ INNOVATION ✦ ECO ✦ …"** ở đáy hero là hiệu ứng chạy ngang liên tục (marquee). Làm đúng theo mục 6.

---

## 1. Đọc trước khi làm (theo thứ tự)

1. `CLAUDE.md` ở gốc repo.
2. `docs/04-cau-truc-ma-nguon.md`, **đọc kỹ**: §1 nguyên tắc; §2.1 luật bố cục L1–L7; §4 gói dùng chung; §5 toàn bộ frontend (5.1 `public/` và `proxy.ts`, 5.2 luật F1–F4, 5.3 chữ giao diện, 5.4 token/icon/chuyển động, 5.6 bản đồ route và tính năng); §7 đặt tên và commit; §10 lint; §13 công thức thêm tính năng.
3. `docs/01-nghiep-vu.md` §2.4 (màn hình ↔ use case) và §9 (phi chức năng: Core Web Vitals, truy cập được, SEO). `docs/02-kien-truc.md`: các dòng về `web`, JavaScript (Server Component mặc định, hiệu ứng nặng tải sau nội dung chính) và `prefers-reduced-motion`.
4. Hệ thống thiết kế **"The Living Gallery"**: tìm bằng `docs/**/design.md`. Đây là nguồn chính cho token, component và animation:
   - §2 màu, §3 chữ, §5–6 hình khối/bóng/texture, §7 chuyển động;
   - §8.2 Tide Dock, §8.3 overlay mục lục, §8.10 ticker, §8.11 story card, §8.16 footer;
   - §9.2 (11 section của landing), §12 responsive và truy cập được.
5. `docs/design/landing-page/`: **mở cả file `.png` lẫn `.html`**. HTML là nguồn cho cấu trúc, copy, thứ tự section và chi tiết hiệu ứng. PNG để đối chiếu hình ảnh.

**Thứ tự ưu tiên khi các nguồn mâu thuẫn:**
- Về **cách viết code** (cấu trúc, token, icon, chữ giao diện, ranh giới): `CLAUDE.md` và `docs/04` thắng.
- Về **giao diện, copy, chuyển động**: `design.md` và mẫu HTML thắng.
- Mọi chỗ mẫu HTML đi ngược quy ước code: theo quy ước, **ghi lại vào báo cáo cuối**, không im lặng chọn.

---

## 2. Kiểm tra hiện trạng repo trước khi viết code

Chỉ đọc, chưa sửa. Trả lời ngắn gọn:

- `apps/web/` và `packages/ui/` đã có chưa? Bố cục có đúng L1–L7 không (mã nằm gọn trong `src/`, `src/proxy.ts`, `public/` ở gốc app, `docs/` ở gốc repo)?
- Phiên bản Next.js (cần ≥ 16), Tailwind (cần v4 CSS-first), `react-icons` đã cài chưa? `packages/ui/src/styles/theme.css` đã có chưa, và `apps/web/src/app/globals.css` có chỉ `@import` token không?
- Logo và ảnh thành viên đang ở đâu? Kỳ vọng: `apps/web/public/images/brand/` và `apps/web/public/images/team/`. Liệt kê tên tệp, kích thước ảnh và dung lượng.
- Trang nào trong bảng route ở `docs/04` §5.6 đã tồn tại?
- Có `npm run lint | typecheck | build | deps:check` chưa?

**Nếu bố cục đang lệch L1–L7** (ví dụ app Next.js còn ở gốc repo, chưa nằm trong `apps/web/`), **dừng lại**, nêu rõ chỗ lệch và hỏi tôi cách xử lý. Không tự di chuyển hàng loạt.

Nếu ổn: tạo nhánh `feat/web-landing-page` từ `develop` (hoặc nhánh hiện tại nếu chưa có `develop`). **Không push, không merge.**

---

## 3. Dịch từ prototype sang quy ước repo

| Prototype (HTML mẫu / `design.md` §13) | Cách làm trong repo |
|---|---|
| Tailwind CDN + `tailwind.config = {...}` | Tailwind v4 CSS-first: token vào `@theme` trong **`packages/ui/src/styles/theme.css`** |
| Hex và `bg-[#...]` rải trong class | Chỉ dùng lớp token (`bg-emerald-brand`, `text-deep-blue`...). **Hex chỉ xuất hiện trong `theme.css`**. Màu phụ kem giấy `#F1ECE1` và viền giấy `#D7CEBA` thêm thành token (ví dụ `paper`, `paper-edge`) |
| Chỉ dùng bộ màu thương hiệu | **Không** đưa cả bộ token Material (`surface-container-*`, `on-*`...) vào. Landing chỉ dùng 6 màu thương hiệu + 2 màu giấy |
| Google Fonts `<link>` | `next/font` tự lưu trữ, subset `latin` + `vietnamese`. Fraunces (có trục `opsz`, in thường và nghiêng) → `--font-fraunces`; Be Vietnam Pro (300–700, nghiêng 300/400) → `--font-be-vietnam-pro`. `display: swap`. Khai báo ở `app/layout.tsx` |
| Material Symbols / SVG icon inline | Icon chỉ dùng **Feather qua `react-icons/fi`** (`FiArrowRight`, `FiX`, `FiChevronDown`, `FiArrowUpRight`, `FiMapPin`, `FiMail`, `FiClock`...). Không viết SVG icon inline |
| Hình trang trí (sóng, gạch chân vẽ tay, vòng đồng tâm, mini QR trong story card, ✦) | **Không phải icon** (`docs/04` §5.4): làm component đồ họa chuyên biệt hoặc tệp trong `public/images/illustrations/`, có `aria-hidden` hoặc `alt` đúng chỗ. Mini QR trong story card là **hình minh họa**, không phải icon (nên không vướng PQ2) |
| TikTok (không có trong Feather) | Dùng **link chữ** "TikTok ↗", giống mục lục ở `design.md` §8.3 |
| Chữ cứng trong HTML | `features/<tên>/constants/text.ts` theo cấu trúc `TEXT = { vi: {...} } as const`. Component đọc chữ từ constants của chính tính năng (self-contained). Giữ đây là **bản chữ dự phòng** cho trang chủ (`docs/04` §5.3) |
| `<script>` inline (dock, cursor, mục lục, tide line) | Client component nhỏ, đúng chỗ. Section mặc định là **Server Component** |
| `dangerouslySetInnerHTML` | Cấm |
| Đường dẫn ảnh viết thẳng | Khai báo ở `src/shared/constants/assets.ts` (ảnh dùng chung) hoặc `constants/` của tính năng; `alt` nằm ở `text.ts` |
| `globals.css` | **Không sửa** (chỉ `@import` token). Muốn thêm token thì làm ở `packages/ui`, commit riêng (xem mục 4) |

**Luật ranh giới cần tuân thủ:** F1 (chỉ import tính năng qua `index.ts`), F2 (tính năng không import tính năng khác; cần chung thì đưa lên `@lavieco/ui` hoặc `src/shared/`), F3, F4. `app/page.tsx` chỉ **ghép** các tính năng. Section chứa form của tính năng khác thì `home` chỉ cung cấp khung (slot `children`), `page.tsx` ghép form vào.

---

## 4. Kế hoạch và thứ tự (commit tách theo bước, Conventional Commits bằng tiếng Anh)

Sau mỗi bước chạy `npm run lint && npm run typecheck` (và `build` khi xong giai đoạn). Chỉ sang bước sau khi xanh.

**Giai đoạn 1: nền + navbar + hero + marquee (làm trước, phải chạy được)**

1. **`feat(ui): add landing tokens and primitives`**, commit riêng vì đụng `packages/ui` (cần người phụ trách thiết kế duyệt):
   - `theme.css`: màu giấy; `--color-hairline` (`rgba(32,52,95,.12)`); radius vòm (thêm `--radius-arch-mat: 150px 150px 18px 18px`); `--tracking-museum`; các shadow trong `design.md` §6.1 mà landing dùng (`ambient`, `ambient-hover`, `float-dock`, `hero-arch`, `emerald-cta`, `tem`, `gallery`); keyframes + biến animation (`--animate-marquee: marquee 32s linear infinite`); các utility/texture (`scallop-pattern`, `deep-sea-pattern`, `film-grain`, `drawn-underline`, scrollbar landing); khối `@media (prefers-reduced-motion: reduce)` theo `design.md` §7.6.
   - Component nguyên thủy (chỉ thứ gì thật sự dùng ≥ 2 nơi): `Button` (primary / secondary / text-link), `PearlDot` (viên ngọc Canary có glow, tuỳ chọn pulse/ping), `ArchFrame` (vòm + mat-board), `Eyebrow`/nhãn `Nº`, `Marquee`, hook `useReveal`.
2. **`feat(web): load fonts, base layout and metadata`**: `next/font`, `lang="vi"`, nền `soft-white` + `film-grain`, `scroll-smooth`, `overflow-x-hidden`, metadata (title, description, Open Graph theo `docs/01` §9 SEO), favicon và ảnh chia sẻ bằng tệp quy ước trong `src/app/` (`icon.*`, `opengraph-image.*`) từ logo có sẵn.
3. **`feat(web): add navigation feature`**: Tide Dock, overlay mục lục, tide line, footer (mục 5).
4. **`feat(web): add home hero and marquee`** (mục 6 và 7).

→ Xong Giai đoạn 1: báo cáo ngắn (đã làm gì, chạy thế nào), rồi **tiếp tục luôn** Giai đoạn 2 trừ khi có điểm cần tôi quyết.

**Giai đoạn 2: các section còn lại**

5. **`feat(web): add home sections`**: theo `design.md` §9.2 và mẫu HTML: #2 Manifesto → #3 Từ vỏ đến tác phẩm → #4 Bốn nấc thang giá trị → #5 Bằng chứng nhỏ, ý nghĩa lớn → #6 Từ một chiếc vỏ đến một hệ sinh thái → #7 Từ Cần Thơ ra biển lớn (Deep Sea) → #8 Lộ trình 3 giai đoạn.
6. **`feat(web): add team feature`**: mục 9.
7. **`feat(web): add contact section UI`**: section #10 (khung ở `home`; form ở `contact` và `gift-request`). Chỉ làm **giao diện + kiểm tra form phía client** (Zod trong `schemas.ts`, ô đồng ý xử lý dữ liệu theo BR-06, `Idempotency-Key`). `lead-service` chưa có (bước 7 của lộ trình), nên phần gửi đi là **stub rõ ràng** trong `actions/`, có `// TODO(lead-service)`, **không giả lập gửi thành công**. Giao diện phải xử lý trạng thái "chưa kết nối được".
8. **`feat(web): compose landing page`**: `app/page.tsx` mỏng, chỉ ghép.

---

## 5. Navbar: hoàn thiện và tối ưu (`features/navigation`)

Mẫu hiện có: wordmark, 4 link (Câu chuyện · Chương trình · Bộ sưu tập · Tác động), nút "Hợp tác cùng chúng tôi", hamburger. Còn thiếu và cần bổ sung:

**Danh sách mục** (khai báo trong `constants/config.ts`, chữ trong `constants/text.ts`; thêm/bớt một mục là sửa một dòng):

| Mục | Route | Tooltip italic (hover) |
|---|---|---|
| Câu chuyện | `/cau-chuyen` | Vì sao vỏ sò không phải rác |
| Chương trình | `/chuong-trinh` | Học bằng đôi tay |
| Bộ sưu tập | `/bo-suu-tap` | Bằng chứng nhỏ, ý nghĩa lớn |
| **Cẩm nang** *(thêm mới)* | `/cam-nang` | Cẩm nang xanh số · miễn phí trọn đời |
| Tác động | `/tac-dong` | Từ Cần Thơ ra biển lớn |
| CTA "Hợp tác cùng chúng tôi" | `/hop-tac` | — |

Lý do thêm **Cẩm nang**: nó là trải nghiệm cốt lõi (UC-01 quét QR → UC-02 đọc), và `docs/01` nói người dùng vào cẩm nang "từ menu". Wordmark/logo dẫn về `/`.

**Yêu cầu:**
- Giữ nguyên ngôn ngữ thị giác của mẫu và `design.md` §8.2: capsule nổi `fixed top-5`, `bg-soft-white/80 backdrop-blur-md`, viền hairline, pill; chấm Canary hiện khi hover kèm tooltip italic Fraunces nền Deep Blue (fade 200ms); thanh tiến độ 2px ở đáy capsule.
- **Chiều rộng:** 5 link + CTA sẽ chật hơn bản 4 link. Mở `max-w` (ví dụ ~960px ở `lg`) và **thử ở 768 / 1024 / 1280 / 1440**: không xuống dòng, không tràn. Dưới breakpoint không đủ chỗ thì ẩn link giữa (chỉ còn wordmark + CTA + hamburger); chọn breakpoint theo phép thử, không đoán.
- **Trạng thái đang xem:** `usePathname()`; `/` khớp chính xác, các mục khác khớp tiền tố; đặt `aria-current="page"`; kiểu hiển thị: chấm Canary luôn hiện + chữ đậm hơn. Hàm khớp là hàm thuần, có `*.spec.ts`.
- **Cuộn:** khi `scrollY > 120` capsule gọn lại và đậm bóng hơn (`design.md` §7.5.3). Một listener `scroll` (passive) dùng chung cho dock progress và tide line; cập nhật bằng `requestAnimationFrame`, hiển thị tiến độ bằng `transform: scaleX()` (origin trái) thay vì đổi `width`, để tránh layout thrash. Thêm **tide line 2px `fixed top-0`** (Emerald, đầu thanh là điểm Canary) như `design.md` §7.5.1.
- **Overlay "Mục lục triển lãm số"** (`design.md` §8.3): nền `deep-sea-pattern`, danh sách `Nº 00…`, vòm preview bên phải, quote *"Make it your life, through art."*, link Facebook ↗ / TikTok ↗ / "Can Tho · Vietnam". Danh sách gồm mọi route: Lời tựa & Triển lãm (`/`) · Câu chuyện: Vỏ sò & Sinh kế · Bốn nấc thang giáo dục · Bộ sưu tập vật phẩm minh chứng · **Cẩm nang xanh số** *(thêm)* · Tác động xã hội & tiêu dùng xanh · Sáu người kể chuyện (neo `/#nguoi-ke-chuyen`) · Cánh cửa đồng hành & liên hệ (`/hop-tac`). Cuối overlay có **nút CTA "Hợp tác cùng chúng tôi"** nổi bật, để người dùng di động (ẩn link giữa) vẫn thấy hành động chính.
- **Truy cập được:** liên kết "Bỏ qua điều hướng" (skip link) tới `#main` (thêm `id="main"` ở layout); nút hamburger có `aria-label`, `aria-expanded`, `aria-controls`; overlay là hộp thoại modal (ưu tiên `<dialog>` + `showModal()` để có sẵn focus trap và Esc; nếu animation fade khó thì tự làm focus trap), khóa cuộn body khi mở, **trả focus về nút hamburger khi đóng**, click một mục thì đóng; focus ring Emerald thấy rõ; điều hướng được hoàn toàn bằng bàn phím.
- **Công tắc ngôn ngữ VI/EN:** hiện chưa có nội dung EN và chiến lược URL (PQ3) chưa chốt. Làm sẵn component nhưng **ẩn sau cờ** `LANGUAGE_SWITCH_ENABLED = false` trong `config.ts`. Không hiển thị công tắc chết.
- **Logo:** dùng file logo thật trong `public/images/brand/` (qua `next/image`) ở dock, overlay và footer. Giữ chấm Canary bằng `PearlDot`. Nếu logo không vừa capsule (tỉ lệ, nền), **báo lại**, đừng tự vẽ lại logo.
- **Link tới trang chưa tồn tại:** giữ `href` đúng theo bảng route, không tạo trang giả. Liệt kê chúng trong báo cáo cuối.

**Footer** (`design.md` §8.16): 4 cột, chữ LAVIECO khổng lồ mờ ~6–8% ở đáy, © 2026. Thông tin liên hệ trong `design.md` (`giatoc@lavieco-gallery.vn`, `curated@lavieco.art`, số điện thoại, giờ mở cửa) là **liệu mẫu**. Đưa vào constants kèm `// TODO(real-data)` và nêu trong báo cáo, đừng coi là thật.

---

## 6. Dải chữ chạy (marquee "LAVI") ở đáy hero

Đây là hiệu ứng **chạy ngang liên tục**, không phải chữ tĩnh. Đặc tả (`design.md` §7.3 và §8.10):

- **Hình thức:** dải full-bleed nền Deep Blue, chữ `text-xs` uppercase `tracking-[0.2em]`, ngăn cách bởi `✦` Canary. Chuỗi: `LIFE ✦ ART ✦ VALUE ✦ INNOVATION ✦ ECO ✦ CUỘC SỐNG, QUA TỪNG NÉT NGHỆ THUẬT ✦ …` (lặp). **Chữ cái đầu** của L·A·V·I·E màu Canary. Đoạn tagline chèn giữa màu Mint Mist. Lấy chuỗi và màu chính xác từ mẫu HTML nếu khác mô tả này.
- **Chuyển động:** `translateX(0) → translateX(-50%)`, `32s linear infinite`. Khai báo keyframes và `--animate-marquee` ở `theme.css`; component `Marquee` trong `@lavieco/ui` là **CSS thuần, Server Component**, không JS.
- **Vòng lặp liền mạch (không giật, không hở):**
  - Nội dung gồm **hai nửa giống hệt nhau**; mỗi nửa phải rộng **≥ chiều rộng viewport** (lặp chuỗi đủ số lần bên trong mỗi nửa, kể cả màn 2560px).
  - Khoảng cách giữa các mục đặt bằng `padding` của chính mục (không dùng `gap` giữa hai nửa) để hai nửa rộng bằng nhau tuyệt đối.
  - `will-change: transform`, chiều cao cố định (không gây CLS).
- **Truy cập được:**
  - Nửa thứ hai `aria-hidden="true"`; bản nghe cho trình đọc màn hình chỉ có **một lần**, dưới dạng chữ `sr-only`.
  - **Tạm dừng khi hover và khi có focus bên trong** (`animation-play-state: paused`). Nội dung tự chuyển động quá 5 giây cần cho người dùng dừng được.
  - `prefers-reduced-motion: reduce`: **dừng hẳn animation** và hiển thị tĩnh một đoạn hoàn chỉnh (căn giữa, cho xuống dòng nếu cần), không để chữ bị cắt cụt vô nghĩa.
- Chữ nằm trong `features/home/constants/text.ts`. Component `Marquee` chỉ nhận `children` và tuỳ chọn thời lượng, không chứa chữ.

---

## 7. Hero

Theo mẫu HTML. Những chi tiết dễ sót (đối chiếu ảnh mẫu):

- Hai badge pill: "Đang thí điểm tại Cần Thơ" (chấm Canary `animate-pulse`) và "GREEN ART EDUCATION".
- H1 ba dòng Fraunces light: "Cuộc sống, / qua từng nét / *nghệ thuật*." Từ nhấn italic Emerald có **gạch chân vẽ tay** (đồ họa, `aria-hidden`). Số **01** khổng lồ làm watermark phía sau (opacity ~.06, `select-none pointer-events-none aria-hidden`, không đè lên chữ khi đọc). Cỡ chữ H1 theo `design.md` §3.3: `54px → 80px → 120px`.
- Đoạn trích triết lý; hai CTA: primary "Bước vào triển lãm" (chấm Canary + `FiArrowRight`, mũi tên dịch 2px khi hover) và text link "Dành cho trường học & doanh nghiệp →".
- Dòng hairline + "GALLERY Nº 2024 · Mekong Estuary Pilot" bên trái và chấm Emerald + "Vật liệu vỏ nghêu, sò, ốc Tây Đô" bên phải.
- Cụm hình bên phải: **3 vòm chồng lớp** (z-index 10/20/30/40 theo `design.md` §13), gradient mint→Emerald, vòng đồng tâm mờ, chấm Canary phát sáng, nhãn "VẬT PHẨM ĐIỂN HÌNH", thẻ "TRIỂN LÃM", nhãn `Nº 003 · THỔ MỘC` "Vỏ điệp & nghêu sông Hậu", và **Story Card nghiêng −5°** (`STORY CARD · Nº 001`, "Vỏ điệp Bến Tre · Nghiền mịn 120 mesh", mini QR dạng đồ họa, "100% Thu gom bản địa"). Hover: thẻ nghiêng thêm ±1–2°.
- Vòm là **placeholder gradient + SVG** như mẫu; không tự thêm ảnh chụp.
- Hero `min-h-screen`; marquee nằm sát đáy hero. Hero **không dùng hiệu ứng reveal** (tránh làm hỏng LCP).
- Nếu ảnh mẫu và HTML lệch nhau, **theo HTML** và ghi vào báo cáo.

---

## 8. Section còn lại

Theo mẫu HTML và `design.md` §9.2 (nền, điểm nhấn từng section đã ghi ở đó). Lưu ý:
- Section #2 Manifesto: ~~rác~~ gạch ngang → *chất liệu* Emerald italic. Section #3: đường nét đứt Emerald nối 4 mốc chỉ hiện từ `lg`. Section #7 và #10 dùng nền **Deep Sea**.
- Bốn nấc thang (#4) dùng `<details>/<summary>` (bàn phím có sẵn), chevron xoay 180° khi mở.
- Khi bố cục lặp (thẻ giai đoạn, thẻ nấc thang so le chiều cao 340→520px), làm đúng ý đồ "bậc thềm thủy triều dâng" của `design.md` §4.2.
- Copy là **bản dự phòng** từ mẫu; nội dung sau này sẽ do `content-service` cung cấp. Cấu trúc dữ liệu trong constants nên dễ thay thế (mảng đối tượng có kiểu), tránh nhét chữ vào JSX.

---

## 9. Ảnh, logo, đội ngũ

- Tệp trong `public/` phải theo `docs/04` §5.1: `kebab-case`, chữ thường, không dấu, không khoảng trắng. **Nếu tệp hiện có vi phạm**, dùng `git mv` đổi tên đúng quy ước và ghi bảng đổi tên trong báo cáo.
- Khai báo mọi đường dẫn ở `src/shared/constants/assets.ts`. Hiển thị bằng `next/image` (`width/height` hoặc `fill` + `sizes`); `priority` chỉ cho ảnh ảnh hưởng LCP.
- **Sáu thành viên** (`features/team`): dữ liệu tĩnh ở `constants/members.ts` (tên, vai trò, ảnh, `alt` ở `text.ts`), ảnh ở `public/images/team/`. Lấy tên và vai trò từ `docs/` và README; nếu không thấy, **để trống kèm `// TODO`**. **Không bịa** chức danh. Section là lưới 3×2 portrait vòm; hover: nhấc `-translate-y-2`, ảnh `scale-105` trong 500ms. `app/` ghép `Team` vào trang chủ.
- Ảnh nào lớn hơn ~500 KB hoặc cạnh dài hơn ~2000 px, **báo trong báo cáo**, đừng tự nén.
- Nhắc lại: ảnh thành viên là dữ liệu cá nhân (AC6), nêu trong báo cáo rằng cần xác nhận sự đồng ý công khai.

---

## 10. Hiệu ứng toàn trang (`design.md` §7)

| Hiệu ứng | Ghi chú triển khai |
|---|---|
| Con trỏ ngọc trai (Canary 12px + halo Deep Blue) | Chỉ `≥ md` và `(pointer: fine)`. Tải muộn (`next/dynamic`, `ssr: false`). **Không ẩn con trỏ hệ thống.** Mở rộng 64px + nhãn "Xem" khi hover phần tử có `data-cursor="view"` (gắn cho thẻ vòm và ảnh, thay cho việc bắt mọi `.group, img`) |
| Reveal khi cuộn | `IntersectionObserver` (threshold .1), `opacity-0 translate-y-4 → 100 / 0`, 700ms. Nội dung phải **hiện đủ khi tắt JS hoặc bật reduced-motion**; không áp cho hero |
| Hover chuẩn | Thẻ nhấc `-8px` + shadow lớn; ảnh trong vòm `scale-105` (500ms); nút `scale-[1.02]` / `active:scale-[.98]`; mũi tên → dịch `translate-x-1`; `duration-300` cho phần còn lại. Không nảy, không bật |
| Chấm Canary | `animate-pulse` / `animate-ping` như `design.md` §7.3, dùng tiết chế (< 5% diện tích) |
| Reduced motion | Tắt con trỏ tuỳ biến, marquee, pulse, ping, spin, reveal (mục 6 và `design.md` §7.6) |

---

## 11. Responsive, truy cập được, hiệu năng

- Mobile-first (phần lớn khách vào từ quét QR bằng điện thoại). Kiểm tra ở **375 / 768 / 1024 / 1440**. Không cuộn ngang ở bất kỳ mức nào.
- Tương phản chữ thân ≥ 4.5:1; Canary không mang thông tin một mình; ảnh có `alt`; `eslint-plugin-jsx-a11y` xanh.
- Thân bài line-height ≥ 1.7 (dấu tiếng Việt).
- Mục tiêu Core Web Vitals: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1. Server Component mặc định; client component chỉ cho dock, overlay, con trỏ, reveal, form. Hiệu ứng nặng tải sau nội dung chính.

---

## 12. Ngoài phạm vi (không làm)

- Các trang con (`/cau-chuyen`, `/chuong-trinh`, `/bo-suu-tap`, `/cam-nang`, `/hop-tac`...), trang 404/coming-soon nếu chưa có.
- Tích hợp `content-service`, `lead-service`, định tuyến i18n, `admin`, backend.
- Sửa `docs/` (kể cả `CLAUDE.md`), `globals.css`, hoặc thêm thư viện ngoài `react-icons` khi chưa cần. Nếu thấy docs cần cập nhật, **ghi vào báo cáo** thay vì tự sửa.

---

## 13. Kiểm chứng trước khi báo xong

- `npm run lint`, `npm run typecheck`, `npm run build`, và `npm run deps:check` (nếu có) đều xanh. Không còn hex rời ngoài `theme.css` (tự `grep` để chắc).
- `npm run dev` chạy được; trang `/` khớp ảnh mẫu ở desktop. Nếu có Playwright thì chụp màn hình 1440 và 375 để so.
- Thử thủ công: điều hướng bằng bàn phím (skip link, dock, overlay, Esc, trả focus); bật `prefers-reduced-motion` (marquee dừng, không còn reveal); marquee lặp liền mạch ở 375 và 2560; tạm dừng khi hover.

---

## 14. Báo cáo cuối (ngắn, dạng danh sách)

1. Các commit đã tạo và cách chạy.
2. Những chỗ **mẫu HTML đi ngược quy ước** và cách đã xử lý.
3. Các quyết định tôi nên biết (ví dụ breakpoint navbar, logo dùng thế nào).
4. Danh sách link đang trỏ tới trang chưa tồn tại.
5. Điểm không nhất quán trong mẫu (ví dụ "GALLERY Nº 2024" ở hero so với "2026" ở footer và các trang khác).
6. Mọi `TODO`: liệu mẫu chưa thay (email, số điện thoại), vai trò thành viên còn thiếu, stub form.
7. Ảnh vượt dung lượng, tệp đã đổi tên, cần xác nhận đồng ý công khai ảnh.
8. Câu hỏi còn mở cần tôi quyết.
