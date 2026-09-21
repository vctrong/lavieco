# LAVIECO — Design System "The Living Gallery"

> File **độc lập, đầy đủ**: chứa toàn bộ token (màu, font, spacing, radius, shadow), phong cách, animation, transition, texture, component, layout và quy tắc nội dung của hệ thống LAVIECO. Không cần tham chiếu file nào khác.
> Được tổng hợp từ: `the_living_gallery/DESIGN.md` + code/screenshot của 9 trang (landing, về chúng tôi, chương trình, bộ sưu tập, chi tiết sản phẩm, cẩm nang xanh số, hợp tác, coming soon, 404).

---

## 0. Tóm tắt 60 giây

- **Là gì**: Giáo dục nghệ thuật xanh từ bột vỏ sò (nghêu, sò, điệp, ốc) tại Cần Thơ/ĐBSCL. Website = **bảo tàng/phòng triển lãm sống**; sản phẩm chỉ là "bằng chứng", giáo dục mới là giá trị. Tagline: *"Cuộc sống, qua từng nét nghệ thuật."* / *"Make it your life, through art."* LAVI-ECO = **L**ife · **A**rt · **V**alue · **I**nnovation · **E**co.
- **Cảm giác**: tĩnh, thiền, sang, học thuật nhưng ấm. Nhiều khoảng trống, ánh sáng dịu, không bóng đổ gắt.
- **6 màu**: Emerald `#10B183` · Deep Blue `#20345F` · Canary `#E7DD6A` (< 5%) · Soft White `#F8FAF6` · Mint Mist `#EAF8F3` · Charcoal `#1E2A32`.
- **2 font**: **Fraunces** (tiêu đề, serif ấm) + **Be Vietnam Pro** (thân bài/UI).
- **Chữ ký hình học**: **vòm (arch)** `160px 160px 24px 24px`, **pill** cho mọi tương tác, **hairline** `rgba(32,52,95,.12)`.
- **Chữ ký chi tiết**: chấm Canary phát sáng ("viên ngọc"), nhãn **Nº 001**, vạch tiến độ 2px đỉnh trang, số watermark khổng lồ, từ khoá *italic Emerald*.
- **Chuyển động**: chậm, mềm; hover nhấc `-8px`, ảnh zoom `1.05`, transition 300ms; không nảy, không bật.

---

## 1. Nguyên tắc thiết kế

1. **Curated Silence** — khoảng trắng rộng rãi để nội dung "thở"; mỗi section là một "phòng trưng bày".
2. **Architectural Portals** — vòm cửa Việt/Pháp thuộc địa, nhà kính; ảnh và card chính đều đặt trong vòm.
3. **Exhibition Metadata** — nhãn bảo tàng (số catalog, chất liệu, xuất xứ) là thành phần phân cấp thông tin hạng nhất.
4. **Sensory Nuance** — lớp phủ trong mờ, viền hairline, tương phản dịu thay vì đường kẻ số cứng.
5. **Từ rác → chất liệu** — ngôn ngữ hình ảnh và copy luôn chuyển hoá: gạch bỏ, viết lại, kể chuyện.
6. **Một điểm sáng duy nhất** — Canary là "viên ngọc": mỗi khung nhìn chỉ vài chấm nhỏ, không bao giờ là mảng màu.

---

## 2. Màu sắc

### 2.1 Palette thương hiệu (nguồn chính để dùng)

| Tên | Hex | Vai trò |
|---|---|---|
| **Emerald** (`emerald-brand`, `brand-emerald`, `primary-container`) | `#10B183` | Xung nhịp sống: CTA chính, trạng thái chọn, progress, số liệu/từ nhấn, focus |
| **Deep Blue** (`deep-blue`, `brand-deepblue`) | `#20345F` | Neo uy tín: tiêu đề, chữ trên nền Emerald, nền "Deep Sea", icon, line-art |
| **Canary** (`canary`, `tertiary-fixed` ≈ `#F0E672`) | `#E7DD6A` | Viên ngọc: chấm, badge nhỏ, số Nº trên nền tối, cursor, gáy sách. **< 5% diện tích** |
| **Soft White** (`soft-white`, `surface`, `background`) | `#F8FAF6` | Nền chính "thạch cao phòng tranh" |
| **Mint Mist** (`mint-mist`, `brand-mint`) | `#EAF8F3` | Nền section phụ, bệ trưng bày, card nền nhẹ, hover nút phụ |
| **Charcoal** (`charcoal`) | `#1E2A32` | Chữ thân bài (thường dùng ở `/85`, `/80`, `/70`, `/60`) |

Phụ trợ đã dùng trong code: kem giấy `#F1ECE1`, viền giấy `#D7CEBA` (Story card / tem), xanh sách `#011944` (`on-secondary-fixed`, nền night-mode của Cẩm nang).

### 2.2 Bộ token ngữ nghĩa (Material-style, dùng ở các trang con)

| Token | Hex | | Token | Hex |
|---|---|---|---|---|
| `surface` / `background` / `surface-bright` | `#f8faf6` | | `primary` / `surface-tint` | `#006c4e` |
| `surface-dim` | `#d8dbd7` | | `on-primary` | `#ffffff` |
| `surface-container-lowest` | `#ffffff` | | `primary-container` | `#10b183` |
| `surface-container-low` | `#f2f4f0` | | `on-primary-container` | `#003c2a` |
| `surface-container` | `#eceeeb` | | `inverse-primary` | `#55ddac` |
| `surface-container-high` | `#e7e9e5` | | `primary-fixed` | `#75fac7` |
| `surface-container-highest` / `surface-variant` | `#e1e3df` | | `primary-fixed-dim` | `#55ddac` |
| `on-surface` / `on-background` | `#191c1a` | | `on-primary-fixed` | `#002115` |
| `on-surface-variant` | `#3d4a43` | | `on-primary-fixed-variant` | `#00513a` |
| `inverse-surface` | `#2e312f` | | `secondary` | `#4b5d8b` |
| `inverse-on-surface` | `#eff1ed` | | `on-secondary` | `#ffffff` |
| `outline` | `#6c7a72` | | `secondary-container` | `#b8cbff` |
| `outline-variant` | `#bbcac1` | | `on-secondary-container` | `#425582` |
| `tertiary` | `#676000` | | `secondary-fixed` | `#d9e2ff` |
| `on-tertiary` | `#ffffff` | | `secondary-fixed-dim` | `#b3c6fa` |
| `tertiary-container` | `#b7ae41` | | `on-secondary-fixed` | `#011944` |
| `on-tertiary-container` | `#454100` | | `on-secondary-fixed-variant` | `#324672` |
| `tertiary-fixed` | `#f0e672` | | `error` | `#ba1a1a` |
| `tertiary-fixed-dim` | `#d3ca59` | | `on-error` | `#ffffff` |
| `on-tertiary-fixed` | `#1f1c00` | | `error-container` | `#ffdad6` |
| `on-tertiary-fixed-variant` | `#4d4800` | | `on-error-container` | `#93000a` |

### 2.3 Quy ước gộp hai bộ (để không mâu thuẫn)

| Ý nghĩa | Dùng |
|---|---|
| Màu thương hiệu Emerald | `#10B183` (= `primary-container`). `primary #006c4e` chỉ dùng cho **chữ/icon Emerald cần độ tương phản cao** trên nền sáng và hover đậm của link (`hover:text-primary`) |
| Deep Blue tiêu đề/nền tối | `#20345F`. `secondary #4b5d8b` chỉ dùng cho **chữ phụ/link/ký hiệu nhạt** (vd. "Sắp ra mắt", số 404 watermark, viền `secondary/5`) |
| Chữ đậm trên nút Emerald | `#20345F` (hoặc `on-secondary-fixed #011944`) — không dùng trắng |
| Canary | `#E7DD6A` cho chấm/glow thương hiệu; `tertiary-fixed #F0E672` cho chấm trong thumbnail/night-mode |
| Chữ thân bài | `#1E2A32` (brand) ≈ `on-surface #191c1a` (Material); ưu tiên Charcoal |

### 2.4 Quy tắc màu bắt buộc

- ❌ Không dùng `#000000` cho chữ/nền ngữ nghĩa. ❌ Không dùng trắng thuần `#FFFFFF` cho nền trang/chữ trên nền tối (dùng Soft White); trắng thuần chỉ cho **card/input nổi** trên `soft-white`.
- **Hairline** mọi viền cấu trúc: `rgba(32,52,95,0.12)` (nền sáng) · `rgba(248,250,246,0.15)` (nền tối). Input: `rgba(32,52,95,0.16)`. Nút phụ: `rgba(32,52,95,0.25)`.
- **Canary** không làm nền lớn, không làm chữ thân bài; chỉ chấm/badge/số Nº/gáy sách/cursor; trên nền tối được dùng cho số Nº và nhãn nhỏ.
- **Từ nhấn**: *italic* Emerald trên nền sáng; Emerald sáng (`#55ddac`/`#10B183`) trên Deep Blue.
- **Deep Sea inversion**: section giáo dục sâu/tác động/liên hệ đảo sang nền `#20345F` + chữ Soft White + nhấn Emerald/Canary.
- Selection bôi đen: nền Mint Mist + chữ Deep Blue (landing) hoặc nền `primary-container` + chữ `on-secondary-fixed` (trang con).
- Không truyền đạt thông tin chỉ bằng màu Canary.

### 2.5 Gradient & nền đặc biệt

| Tên | CSS |
|---|---|
| Mat mint→Emerald (vòm ảnh) | `linear-gradient(to bottom, #EAF8F3, #EAF8F3, rgba(16,177,131,.25))` |
| Deep Sea dốc | `linear-gradient(to bottom, #20345F, #20345F, rgba(16,177,131,.30))` |
| Journey ngang | `linear-gradient(to right, #F8FAF6, #EAF8F3, #20345F)` |
| Tide line 4 nấc | `linear-gradient(to right, #EAF8F3, #10B183, #20345F)` (đường 2px nối 4 thẻ) |
| Tiến độ Coming soon | Emerald đậm → Emerald → Canary (kết thúc bằng vàng) trên track `#e1e3df` |
| Mint blob nền hero | tròn `w-96 h-96` `bg-mint-mist/80` + `blur-3xl` |
| Ánh sáng nền Deep Sea | `radial-gradient(circle at 100% 100%, rgba(16,177,131,.08), transparent 50%), radial-gradient(circle at 0 0, rgba(231,221,106,.04), transparent 40%)` trên `#20345F` |

---

## 3. Typography

### 3.1 Font

| Vai trò | Font | Fallback | Tải |
|---|---|---|---|
| Display & headline | **Fraunces** (serif, có opsz) | `serif` | `Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,300;1,9..144,400;1,9..144,500` |
| Body & UI | **Be Vietnam Pro** | `sans-serif` | `Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400` |
| Icon | **Material Symbols Outlined** | — | `wght,FILL@100..700,0..1` |
| Mã hiệu/nhãn kỹ thuật (Nº, tem) | `font-mono` hệ thống, uppercase tracking `0.14em` | — | — |

Fraunces được chọn vì ấm, mềm nét thư pháp và cân bằng với dấu tiếng Việt. Be Vietnam Pro thiết kế cho tiếng Việt. **Luôn khai `font-display`/`display-hero`… kèm fallback** (screenshot 404 và Coming soon cho thấy render serif mặc định khi font chưa nạp).

### 3.2 Thang chữ (token)

| Token | Font | Cỡ | Line-height | Weight | Tracking |
|---|---|---|---|---|---|
| `display-hero` | Fraunces | 64px | 76px | 400 | -0.02em |
| `display-hero-mobile` | Fraunces | 40px | 48px | 400 | -0.01em |
| `headline-lg` | Fraunces | 44px | 54px | 400 | -0.015em |
| `headline-lg-mobile` | Fraunces | 30px | 38px | 400 | -0.01em |
| `headline-md` | Fraunces | 32px | 42px | 400 | -0.01em |
| `headline-sm` | Fraunces | 24px | 32px | 500 | — |
| `title-editorial` | Fraunces | 20px | 30px | 400 | — |
| `body-lg` | Be Vietnam Pro | 18px | 31px | 300 | — |
| `body-md` | Be Vietnam Pro | 15px | 26px | 400 | — |
| `body-sm` | Be Vietnam Pro | 13px | 22px | 400 | — |
| `label-caps` | Be Vietnam Pro | 12px | 16px | 600 | 0.12em, UPPERCASE |
| `metadata-curatorial` | Be Vietnam Pro | 11px | 16px | 500 | 0.06em |

### 3.3 Cỡ chữ "hero" thực tế ở landing (vượt thang token)

| Dùng cho | Class |
|---|---|
| H1 hero | `text-[54px] sm:text-[80px] lg:text-[120px] leading-[1.02] font-light tracking-tight` |
| Section title | `text-4xl md:text-6xl font-light tracking-tight` |
| Manifesto | `text-3xl sm:text-4xl md:text-5xl lg:text-[54px] leading-[1.3] font-light`; từ nhấn `text-4xl…lg:text-[58px]` |
| Số watermark | `text-[260px] sm:text-[320px] lg:text-[360px] font-light leading-none` opacity `.06`; số giai đoạn `text-[140px]` opacity `.15`; 404 `text-[18rem] md:text-[28rem]` opacity `.04` |
| Mục lục Nº | số `text-sm` Canary + tiêu đề `text-3xl md:text-5xl font-light` |
| Nhãn eyebrow | `text-xs`/`text-[11px]` uppercase `tracking-museum (0.14em)` |
| Chữ rất nhỏ trên tem | 8.5–10.5px (`font-mono`), chỉ dùng cho nhãn phụ |

### 3.4 Quy tắc chữ

- **Sentence case** cho headline. **Italic** *chỉ* cho: từ khoá cảm xúc (*nghệ thuật*, *chất liệu*, *rác*, *sống*, *hành trình*, *trôi ra biển*, *dở*, *đâu*), tên tác phẩm, trích dẫn, tooltip, tên loài.
- Thân bài line-height **1.7–1.75** để dấu tiếng Việt thoáng.
- Nhãn/marker/catalog: **uppercase + tracking 0.12–0.14em**.
- Trích dẫn lớn: Fraunces *italic*, viền trái 2–3px Emerald.
- Số trang/watermark: Fraunces light *italic* (số trang 24/25).
- Độ dày: display `300` (light) là chủ đạo; `400–500` cho từ nhấn/tiêu đề card; wordmark LAVIECO `600–700`.

---

## 4. Layout, lưới & khoảng cách

### 4.1 Token spacing

| Token | Giá trị | | Token | Giá trị |
|---|---|---|---|---|
| `space-xs` | 0.25rem | | `gutter` | 1.5rem |
| `space-sm` | 0.5rem | | `gutter-tablet` | 2rem |
| `space-md` | 1rem | | `gutter-desktop` | 3rem |
| `space-lg` | 1.75rem | | `margin` | 1.25rem |
| `space-xl` | 3rem | | `margin-tablet` | 2.5rem |
| | | | `margin-desktop` | 4.5rem |

### 4.2 Lưới & breakpoint

| Màn hình | Cột | Margin ngoài | Gutter | Hành vi |
|---|---|---|---|---|
| Mobile `< 768px` | 4 | 1.25rem | 1.5rem | xếp dọc thành "hiện vật" |
| Tablet `768–1024px` | 8 | 2.5rem | 2rem | 2 cột: metadata cạnh hình |
| Desktop `> 1024px` | 12, **bất đối xứng** | 4.5rem | 3rem | hình 7 cột + wall text 4 cột + 1 cột trống "im lặng"; hero 7/5 |

- Padding ngang section thực tế: `px-6 md:px-16 lg:px-24` (`lg:px-28` cho manifesto). Container `max-w-7xl mx-auto`.
- **Nhịp dọc giữa các "phòng"**: `py-32` (8rem), manifesto `py-44` (11rem); desktop 6–9rem. Header section cách nội dung `mb-20`.
- Hero `min-h-screen pt-28 pb-16`. Trang 404/coming soon: `min-h-[calc(100vh-2px)]`, căn giữa cả hai chiều.
- **So le có chủ đích**: bộ sưu tập masonry 3 cột lệch nhau; 4 nấc thang và 4 giai đoạn tăng chiều cao dần (thẻ 340→420→480→520px; nấc thang `min-h` 380→420→460→…) như bậc thềm/thủy triều dâng.
- Footer: 4 cột (thương hiệu+trích dẫn · Danh mục điều hướng · Thông tin toạ độ · MXH & lưu trữ) + dòng bản quyền + chữ **LAVIECO** cực lớn mờ ở đáy, nền `surface-container-low`/tương đương Mint Mist nhạt.

---

## 5. Hình khối (shape)

### 5.1 Border radius

| Token | Giá trị | Dùng |
|---|---|---|
| `sm` | 0.5rem | chip nhỏ, nhãn nhỏ |
| `DEFAULT` | 1rem | input, card nhỏ |
| `md` | 1.5rem | card |
| `lg` | 2rem | card lớn, form |
| `xl` | 3rem | khung lớn (split hợp tác) |
| `full` | 9999px | pill: nút, chip, nav, tag, avatar |
| `2xl / 3xl` (Tailwind) | 16 / 24px | pedestal card, thẻ nấc thang |
| `arch-sm` | `100px 100px 16px 16px` | vòm nhỏ / mobile (~`90px 90px 16px 16px`) |
| `arch` | `160px 160px 24px 24px` | vòm chuẩn (bản chương trình: `180px 180px 24px 24px`; token gốc: `140px 140px 20px 20px`) |
| `arch-lg` | `220px 220px 32px 32px` | vòm lớn (bản chương trình: `260px 260px 32px 32px`) |
| `rounded-t-full rounded-b-2xl` | — | vòm cong hoàn toàn (thẻ giai đoạn, hero composition) |
| Vòm mat-board | trong `rounded-[150px_150px_18px_18px]` | ảnh lồng trong khung, đệm 8–12px Mint Mist |

### 5.2 Quy tắc hình

- **Vòm**: ảnh hero, thẻ sản phẩm, portrait đội ngũ, thẻ giai đoạn, preview mục lục, thumbnail sản phẩm.
- **Pill**: *mọi* phần tử tương tác (nút, chip lọc, nav, tag giá, ô email, tooltip).
- **Pedestal card**: `16–24px` + hairline 1px; card nổi trắng `surface-container-lowest`.
- Khung ảnh lồng: **mat-board** đệm `p-2`–`p-3.5` (8–14px) màu Mint Mist/Soft White quanh ảnh.

---

## 6. Độ sâu, viền & texture

### 6.1 Bóng đổ (tất cả nhuộm Deep Blue, phân tán rộng, độ mờ thấp)

| Tên | CSS | Dùng |
|---|---|---|
| `shadow-ambient` | `0 16px 36px -12px rgba(32,52,95,.08)` (thực tế dùng `.06–.08`) | card mặc định |
| `shadow-ambient-hover` | `0 28px 60px -16px rgba(32,52,95,.12)` | hover card/artwork, modal |
| `shadow-sm-soft` | `0 4px 16px -8px rgba(32,52,95,.06)` / `0 8px 24px -10px rgba(32,52,95,.06)` | chip, chip nổi |
| `shadow-md-soft` | `0 12px 28px -12px rgba(32,52,95,.07)` / `0 20px 40px -14px rgba(32,52,95,.12)` | card trung bình |
| `shadow-gallery` | `0 24px 48px -12px rgba(32,52,95,.08)` | card mở (open) |
| `shadow-float-dock` | `0 16px 36px -8px rgba(32,52,95,.12)` | Tide Dock |
| `shadow-dock` | `0 8px 24px rgba(32,52,95,.06)` → khi cuộn `0 12px 32px rgba(32,52,95,.12)` | nav capsule |
| `shadow-hero-arch` | `0 24px 50px rgba(32,52,95,.14)` / `0 20px 40px rgba(32,52,95,.18)` | vòm hero |
| `shadow-emerald-cta` | `0 4px 16px rgba(16,177,131,.28)` (nút nav: `0 2px 8px rgba(16,177,131,.25)`; hover đậm: `0 8px 20px rgba(16,177,131,.3)`) | nút Emerald |
| `shadow-book` | `0 28px 60px -16px rgba(32,52,95,.25)` | quyển sách Cẩm nang |
| `shadow-tem` | `0 12px 28px rgba(32,52,95,.15)` | tem/story card xoay |
| **Glow Canary** | `0 0 6px / 0 0 8px / 0 0 10px / 0 0 12px #E7DD6A` (hoặc `rgba(240,230,114,.9)`) | chấm viên ngọc |
| **Glow Emerald** | `0 0 6/8/12px #10B183` | chấm Emerald |
| Halo cursor | `0 0 0 2px #20345F` | cursor pearl |

Không dùng bóng đen thuần / bóng gắt / nhiều lớp công nghiệp.

### 6.2 Viền

- Hairline chuẩn 1px; card nhấn: `border-2 border-emerald-brand/40`; vòm hero `border-emerald-brand/30`; thẻ 04 `border-canary/40`; thumbnail chọn `ring-2 ring-primary-container`.
- Vòng ripple nền: `border border-secondary/5`, `secondary/[0.03]`.

### 6.3 Blur/glass

`backdrop-blur-md` (nav, nhãn nổi, ~20 chỗ) · `backdrop-blur-sm` · `backdrop-blur-xl` (overlay, thẻ kính). Nền kính: `bg-soft-white/80–95`, `bg-soft-white/10` trên nền tối, viền `white/10–20`.

### 6.4 Texture & nền (copy nguyên được)

```css
/* Vảy sò (scallop) – nền section chuyển tiếp, opacity ~4–5% */
.scallop-pattern{
  background-color:#EAF8F3;
  background-image:radial-gradient(circle at 50% 0,transparent 18px,rgba(32,52,95,.04) 19px,rgba(32,52,95,.04) 20px,transparent 21px);
  background-size:40px 30px;
}
/* Vảy sò (trang chương trình) */
.bg-scallop-subtle{
  background-image:
    radial-gradient(circle at 50% 0%,rgba(16,177,131,.06) 0%,transparent 70%),
    repeating-radial-gradient(circle at 50% 100%,rgba(32,52,95,.02) 0,rgba(32,52,95,.02) 16px,transparent 16px,transparent 32px);
}
/* Deep Sea */
.deep-sea-pattern{
  background-color:#20345F;
  background-image:
    radial-gradient(circle at 100% 100%,rgba(16,177,131,.08) 0%,transparent 50%),
    radial-gradient(circle at 0% 0%,rgba(231,221,106,.04) 0%,transparent 40%);
}
/* Film grain phủ toàn body (landing) – 3.5% */
.film-grain{background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.035'/%3E%3C/svg%3E");}
/* Chấm hạt nhẹ (trang chương trình) */
.film-grain-dots{background-image:radial-gradient(rgba(30,42,50,.03) 1px,transparent 0);background-size:24px 24px;}
/* Ripple chấm nước (trang con: 404, coming soon, về chúng tôi, hợp tác, Cẩm nang) */
.bg-ripple-pattern{
  background-image:
    radial-gradient(circle at 50% 0%,rgba(32,52,95,.05) 0%,rgba(32,52,95,.05) 1px,transparent 1px),
    radial-gradient(circle at 50% 0%,rgba(32,52,95,.04) 0%,rgba(32,52,95,.04) 2px,transparent 2px);
  background-size:48px 48px,96px 96px;
}
/* Ripple (bộ sưu tập, chi tiết sản phẩm) – thêm chấm Emerald */
.ripple-pattern{
  background-image:
    radial-gradient(circle at 50% 50%,rgba(32,52,95,.05) 1px,transparent 1px),
    radial-gradient(circle at 50% 50%,rgba(16,177,131,.04) 2px,transparent 2px);
  background-size:48px 48px,96px 96px;
}
/* Mask viền sóng chuyển section */
.wave-edge{mask-image:radial-gradient(ellipse 100% 50% at 50% 100%,black 70%,transparent 100%);}
/* Gạch chân vẽ tay Emerald */
.drawn-underline{position:relative;display:inline-block;white-space:nowrap;}
.drawn-underline::after{content:'';position:absolute;left:-4%;bottom:2px;width:108%;height:6px;background:#10B183;border-radius:999px;opacity:.85;transform:rotate(-.7deg);}
/* Viên ngọc Canary */
.pearl-dot{width:8px;height:8px;background:#E7DD6A;border-radius:9999px;display:inline-block;box-shadow:0 0 10px rgba(231,221,106,.8);}
```

Đường SVG trang trí (opacity 10–20%, stroke 1px): vòng đồng tâm `circle cx=50% cy=100% r=40/70/100/130` (sóng lan), sóng `M0 40 Q 60 70 120 40 T 240 40…`, ellipse lồng nhau, hình chữ nhật lồng bo góc, đường chéo. Số watermark khổng lồ dùng `select-none pointer-events-none` và `-z-0/-z-10`.

### 6.5 Scrollbar & cuộn

- Landing: scrollbar 6px, track `#F8FAF6`, thumb `rgba(32,52,95,.2)` pill, hover **Emerald**.
- Trang con: **ẩn scrollbar** (`::-webkit-scrollbar{display:none}`), `overscroll-behavior:none`, reset `html,body{margin:0;padding:0}`, `main > :first-child{margin-top:0!important}`, `main > :last-child{margin-bottom:0!important}`.
- `html.scroll-smooth`, `body.overflow-x-hidden`, `antialiased`.

---

## 7. Chuyển động (animation & transition)

### 7.1 Triết lý

Chậm, êm, mực nước dâng. **Không bounce/spring**. Chuyển động phải giống *thủy triều, ánh sáng lấp lánh, lật trang* — không giống app.

### 7.2 Token thời gian & easing

| Token | Giá trị | Dùng |
|---|---|---|
| `dur-instant` | 75–100ms, ease-out | thanh tiến độ cuộn (width) |
| `dur-cursor` | 120ms, ease-out | vị trí cursor |
| `dur-fast` | 150ms | đổi ảnh gallery (opacity 1→.5→1) |
| `dur-base` | **200–300ms** (`duration-300` = 65 lần dùng, chuẩn) | hover màu/nền/shadow/scale/translate, overlay fade, filter fade, chevron |
| `dur-medium` | 500ms (39 lần) | zoom ảnh, đổi cỡ vòm, panel |
| `dur-slow` | 700ms (18 lần) | reveal section khi cuộn |
| `dur-loop` | 32s linear / 4s ease-in-out / 160s linear | marquee / pulse chậm / vòng quay nền |
| Easing | mặc định Tailwind (`cubic-bezier(.4,0,.2,1)`), `ease-out` cho tương tác vào; `linear` cho loop | — |

Thuộc tính transition dùng: `transition-all` (132), `transition-colors` (111), `transition-transform` (67), `transition-opacity` (10), `transition-shadow` (3).

### 7.3 Keyframes / animation

```css
/* Marquee LAVI ở đáy hero – lặp nội dung 2 lần, dịch -50% */
@keyframes marquee { 0%{transform:translateX(0%)} 100%{transform:translateX(-50%)} }
.animate-marquee{display:inline-flex;white-space:nowrap;animation:marquee 32s linear infinite;}
```
Tailwind utility: `animate-pulse` (chấm Canary nhấp nháy: badge pilot, chấm hero, Story Card, viên ngọc mục lục — 10 lần), `animate-ping` (vòng lan tỏa quanh chấm, 5 lần), `animate-[pulse_4s_ease-in-out_infinite]` (ánh sáng nền chậm), `animate-[spin_160s_linear_infinite]` (vòng đồng tâm quay rất chậm ở nền).

### 7.4 Tương tác hover / focus / active (chuẩn)

| Phần tử | Hiệu ứng |
|---|---|
| Card / thẻ nấc thang / thẻ giai đoạn | `group-hover:-translate-y-2` (đôi khi `-4`/`-5` cho card lớn) + `hover:shadow-[0_28px_60px_-16px_rgba(32,52,95,.12)]` · `duration-300` |
| Ảnh trong vòm | `group-hover:scale-105` (22 lần) hoặc `scale-110` (10 lần) · `duration-500`; ảnh ẩn bằng `scale-100` ban đầu |
| Nút Emerald | `hover:scale-[1.02]` + bóng mềm hơn; `hover:bg-emerald-brand/90`; `active:scale-[0.98]` |
| Nút phụ | hover nền `#EAF8F3`; viền đổi `hover:border-deep-blue` / `hover:border-emerald-brand` |
| Link/mũi tên → | `group-hover:translate-x-1` (9 lần) hoặc `translate-x-0.5` |
| Text link | `hover:text-emerald-brand` / `hover:text-primary` / `hover:text-deep-blue` (`transition-colors`) |
| Nav item (landing) | hiện chấm Canary `opacity-0→100` + tooltip italic Fraunces nền Deep Blue fade-in 200ms |
| Wordmark | `group-hover:text-emerald-brand` |
| Hamburger 2 vạch | `group-hover:w-4` (vạch ngắn dài ra) · viền `hover:border-deep-blue` |
| Mục lục | `hover:pl-3` dịch phải + tiêu đề `group-hover:text-emerald-brand` |
| Card nghiêng (story card) | `group-hover:rotate-[±1–2deg]` |
| Dòng ô liên hệ / hàng danh sách | `hover:bg-surface-container-low` (13), `hover:bg-surface/[.07]` trên nền tối |
| Chip lọc | đổi nền Soft White→Deep Blue, chấm Canary `opacity-0→100` |
| Card flip | `perspective:1000px`, `transform-style:preserve-3d`, `backface-visibility:hidden`, `.group:hover .flip-card-inner{transform:rotateY(180deg)}` |
| Input focus | `focus:outline-none` + `focus:border-emerald` + `focus:ring-2 ring-primary-container` (hoặc ring `0 0 0 3px rgba(16,177,131,.15)`), `focus-within:border-primary-container`; placeholder `text-on-surface-variant/40` (nền sáng) / `soft-white/30` (nền tối) / `text-outline` |
| Accordion `<details>` | `open:` đổi nền (`open:bg-brand-mint/30`, trên nền tối `open:bg-white/5→10`), `open:shadow-gallery`, `open:text-canary`; `details[open] summary svg{transform:rotate(180deg)}` |
| Radio/checkbox card | `peer-checked:border-brand-emerald`, `peer-checked:bg-brand-mint/40`, `peer-checked:text-brand-deepblue` |

### 7.5 Scroll-driven & JS interactions

1. **Tide line (đỉnh trang)**: thanh `fixed top-0 h-[2px] z-50`, nền trong suốt; phần fill Emerald `width = scrollY/(scrollHeight−clientHeight)·100%`, `transition-all duration-75 ease-out`. Đầu thanh có điểm Canary (trên trang con: khối `w-24 bg-tertiary-fixed ml-auto` cố định bên phải).
2. **Dock progress**: cùng công thức, thanh `2px` đáy Tide Dock (`duration-100`, nền track `emerald/30`, fill `emerald/85`).
3. **Dock co lại**: khi `scrollY > 120` → thêm bóng `0 12px 32px rgba(32,52,95,.12)` và `py-2.5 → py-2` (capsule gọn hơn).
4. **Overlay mục lục**: mở = bỏ `hidden`, sau 10ms đổi `opacity-0→100` (fade 300ms), `body.overflow=hidden`; đóng = fade rồi 300ms sau thêm lại `hidden`; click bất kỳ mục = đóng.
5. **Custom cursor (chỉ ≥ md)**: pearl 12px Canary + halo Deep Blue theo `mousemove` (`translate(x,y)`, `transition: transform .12s ease-out, width/height/background/border-radius .25s ease`). Khi hover `.group, img, .rounded-arch` → mở rộng **64px**, hiện nhãn "Xem" (`text-[10px] uppercase tracking-wider` Deep Blue, opacity 0→1, 200ms); rời chuột → về 12px.
6. **Reveal section khi cuộn** (Về chúng tôi): `IntersectionObserver threshold .1`, mỗi `section` có `transition-all duration-700`; vào vùng nhìn: `opacity-0 translate-y-4 → opacity-100 translate-y-0`.
7. **Lọc sản phẩm** (Bộ sưu tập): ẩn = `opacity 0 + scale(.97)` rồi `display:none` sau 300ms; hiện = `display:flex` → sau 10ms `opacity 1 + scale(1)`.
8. **Đổi ảnh gallery** (chi tiết SP): main image `opacity .5` → sau 150ms đặt ảnh mới `opacity 1`; thumbnail chọn = `ring-2 ring-primary-container` + chấm Canary `absolute top-2 right-2 w-2 h-2` glow `0 0 6px rgba(240,230,114,.9)`.
9. **Lift-the-flap** (Cẩm nang): bấm thẻ → `max-height: scrollHeight px`, `opacity 1`, chevron `rotate(180deg)`; đóng lại `max-height:0`, `opacity 0`. Transition `max-height/opacity ~300–500ms`.
10. **Night mode sách**: đảo 2 trang `bg-surface-container-lowest text-on-surface` → `bg-on-secondary-fixed (#011944) text-surface`, icon `dark_mode → light_mode` màu `tertiary-fixed`.
11. **Chip đối tác** (Hợp tác): chip chọn = `bg-primary-container text-on-secondary-fixed shadow-sm` + hiện chấm Canary; chip chưa chọn = `bg-surface-container-low text-on-surface-variant`.
12. **Form email Coming soon**: hợp lệ (`includes('@')`) → khoá input + nút (`opacity-80`, chữ "Đã ghi nhận") + hiện ack `inline-flex`; không hợp lệ → focus lại input.

### 7.6 Reduced motion (bổ sung bắt buộc khi triển khai)

```css
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important;}
}
```
(Ẩn cursor tuỳ biến, dừng marquee/pulse/ping/spin.)

---

## 8. Component

### 8.1 Nút

| Loại | Đặc tả |
|---|---|
| **Primary** | pill; nền `#10B183`; chữ Deep Blue `font-bold text-sm`; padding `px-7 py-3.5` (nav: `px-4 py-1.5 text-[12.5px] font-semibold`); shadow Emerald; hover `scale-[1.02]`, bg `/90`; active `scale-[.98]`; có thể kèm chấm Canary 6px + mũi tên SVG `w-4 h-4` (dịch phải 2px khi hover) |
| **Secondary** | pill; nền trong suốt; viền `1px rgba(32,52,95,.25)`; chữ Deep Blue; hover nền Mint Mist |
| **Text link** | Deep Blue `text-sm font-medium`; mũi tên `→` dịch phải 4px khi hover; hover đổi Emerald |
| **Trên nền Deep Sea** | nền Mint Mist hoặc Emerald, chữ Deep Blue |
| **Nút đóng overlay** | pill outline `border white/15`, chữ `text-xs uppercase tracking-museum text-mint-mist`, hover Canary, icon ✕ 14px |
| **Nút icon tròn** | `w-8 h-8` (nav) / `w-10` viền hairline; hamburger 2 vạch `w-3.5` và `w-2.5` cao 1.5px, `gap-1`; avatar tròn nền `#006c4e` icon trắng |
| **Disabled** | `opacity-80`, không hover |

### 8.2 Tide Dock (navbar)

Capsule nổi `fixed top-5 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-[880px]`; `bg-soft-white/80 backdrop-blur-md rounded-full border hairline px-5 py-2.5`; trái: wordmark **LAVIECO** (Fraunces `text-xl font-semibold tracking-tight` Deep Blue) + chấm Canary 6px glow `0 0 6px #e7dd6a`; giữa (`hidden md:flex gap-7 text-[13.5px] font-medium text-charcoal/85`): 4 link + tooltip italic (`text-[11px] font-display italic` nền Deep Blue chữ Soft White pill); phải: CTA "Hợp tác cùng chúng tôi" + hamburger (+ avatar ở trang con). Đáy: thanh tiến độ 2px. Trang con: có nhãn phụ cạnh logo ("Sài Gòn · Cần Thơ", "Viện nghệ thuật xanh", "Cẩm nang xanh số") ở `text-[10–11px] uppercase tracking`.

### 8.3 Mục lục toàn màn hình (Catalogue Overlay)

`fixed inset-0 z-50 deep-sea-pattern text-soft-white p-8 md:p-14 overflow-y-auto`, fade 300ms. Top: LAVIECO + chấm Canary `w-2 h-2` glow + nhãn "Mục Lục Triển Lãm Số" + nút "Đóng lại". Giữa: grid 12 cột — trái 7 cột danh sách **Nº 00–06** (mỗi hàng `border-b white/15`, số Canary `text-sm tracking-museum`, tiêu đề Fraunces `text-3xl md:text-5xl font-light`); phải 5 cột vòm preview `280×380` (`rounded-arch`, viền `soft-white/20`, `p-2`, gradient Deep Blue→Emerald 30%, vòng đồng tâm Canary 15%, kính mờ nhãn "Nº 001 · Cần Thơ" + quote italic). Đáy: toggle **VI / EN** (VI Canary semi-bold), quote *"Make it your life, through art."*, link Facebook ↗ / TikTok ↗ / "Can Tho · Vietnam". Mục: Lời Tựa & Triển Lãm · Câu Chuyện: Vỏ Sò & Sinh Kế · Bốn Nấc Thang Giáo Dục · Bộ Sưu Tập Vật Phẩm Minh Chứng · Tác Động Xã Hội & Tiêu Dùng Xanh · Sáu Người Kể Chuyện · Cánh Cửa Đồng Hành & Liên Hệ.

### 8.4 Museum wall label (placard)

`Nº [0-9]{3}` (Emerald hoặc Canary trên nền tối) + `·` + chất liệu (medium) + xuất xứ UPPERCASE (`Cần Thơ`, `Hà Nội`, `Đà Nẵng`). Chữ 9–11px, tracking 0.06–0.14em, Charcoal 70%, có thể `font-mono`. Xuất hiện: badge hero, card, chi tiết SP ("Nº [SỐ] · CHẤT LIỆU: BỘT VỎ SÒ TỰ NHIÊN"), footer ("Nº 001 · PHÙ SA & LÚA NƯỚC"), 404 ("Nº 404 · LẠC LỐI BIỂN KHƠI · 2026"), Coming soon ("Nº 00 · ĐANG TÁC TẠO · 2026").

### 8.5 Arch card / Product card / Specimen frame

Vòm `rounded-arch` + hairline + mat-board Mint Mist 12px; nền gradient mint→trắng; SVG đồng tâm mờ; Story Card kem nghiêng trên đỉnh (`STORY CARD · 2026`, chấm Emerald/Canary, nội dung ngắn); dưới: `Nº 00X · CHẤT LIỆU: BỘT VỎ SÒ TỰ NHIÊN` (metadata), tên (Fraunces `text-lg/xl`), **giá pill** (nền Deep Blue chữ Soft White cho khoảng cao; nền nhạt `mint`/hairline cho khoảng thấp) + ghi chú nhỏ "(kèm story card)". Hover: nhấc `-translate-y-2`, ảnh `scale-105/110` 500ms, shadow `0 28px 60px -16px`.

### 8.6 Chip lọc & Tab

Chưa chọn: Soft White + hairline + Charcoal, chấm ẩn. **Đã chọn**: `bg-[#20345F] text-[#F8FAF6]` (bộ sưu tập) hoặc Emerald + Deep Blue (hợp tác/quy chuẩn), **chấm Canary 6px** dẫn đầu. Lọc: Tất cả · Móc khoá & charm · Décor mini để bàn · Combo quà tặng xanh. Chip đối tác: Trường học · Doanh nghiệp ESG · Khu du lịch & homestay · Nhà hàng/Quán ăn · Khác.

### 8.7 Form

- Nhãn: `text-[11–12px] uppercase tracking` Charcoal/Deep Blue; dấu `*` bắt buộc.
- Input: nền trắng/Soft White, viền `rgba(32,52,95,.16)` hoặc underline, bo `rounded-DEFAULT`; **focus** viền Emerald + ring `rgba(16,177,131,.15) 3px`; placeholder mờ (`/40`).
- Textarea 4–5 dòng; select mục tiêu quan tâm; **radio-card** ("Trường học/Cộng đồng/Doanh nghiệp").
- Checkbox/radio: bo 6px hoặc tròn; unchecked viền Deep Blue hairline; checked nền Emerald + tick trắng hoặc chấm Canary.
- Submit: pill Emerald full-width + mũi tên; dòng cam kết phản hồi dưới nút ("Chúng tôi sẽ liên hệ lại sớm" / "trong 24h").
- Trường form hợp tác: Họ tên · Đơn vị/Tổ chức · SĐT/Zalo · Email · (Mục tiêu quan tâm) · Lời nhắn.
- Ô email Coming soon: capsule trắng + shadow mềm, nút pill Emerald liền bên trong ("Nhận tin khi ra mắt").

### 8.8 Accordion "Bốn nấc thang" (`<details>`)

Hàng: badge số `01–04` (tròn Emerald, số 04 nền Canary), tag loại (Miễn phí / 2–3 giờ / 3–5 buổi / Đối tác), tiêu đề Fraunces, chevron xoay 180° khi mở. Mở: nền Mint Mist/`white/5` (nền tối), `shadow-gallery`, bên trong 3 ô "Đối tượng tham gia / Nội dung / Kết quả" (`text-[11px] uppercase` nhãn + `text-xs` nội dung). Đường dọc Emerald nối các hàng.

### 8.9 Thẻ đối tượng kép

**Trường học** (sáng, hairline, bullet Canary) đối lập **Doanh nghiệp** (Deep Blue, chữ trắng, bullet Emerald, link "Liên hệ bộ phận CSR →"), hình blob mờ ở góc.

### 8.10 Stats / Impact

Số lớn Fraunces (`15%/năm`, `72%`, `54%`) Emerald/Canary trên Deep Sea + caption 11px; 2 trụ cột card kính trên nền tối (icon Emerald, chấm Canary). Ticker LAVI: nền `#20345F`, chữ `text-xs tracking-[0.2em] uppercase`, chữ cái đầu Canary, dấu `✦` Canary, đoạn chèn Mint Mist "CUỘC SỐNG, QUA TỪNG NÉT NGHỆ THUẬT" / "CAN THO ESTUARY PILOT".

### 8.11 Story card / Tem

Nền `#F1ECE1`, viền `#D7CEBA`, bo `rounded-2xl`, `rotate-[-5deg]`, bóng tem, header mono "STORY CARD · Nº 001" + chấm; nội dung Fraunces italic 11–12px; mini QR trong ô Deep Blue chữ Canary; caption "100% Thu gom bản địa" mono Emerald đậm; "LAVIECO ID #04 · 0.24kg vỏ".

### 8.12 Cẩm nang xanh số (e-book)

- Header capsule: logo + "CẨM NANG XANH SỐ" + tab công cụ (đọc, bookmark, dark mode, cỡ chữ `TT 100%`).
- **Khung sách**: 2 trang trắng, gáy dọc **Canary** `w-5` ở giữa kèm bóng đổ gáy xám, góc giấy gập, bóng `0 28px 60px -16px rgba(32,52,95,.25)`; header trang `CẨM NANG XANH SỐ · CHƯƠNG 2` + "Số trang / 2026"; footer: số trang italic lớn (`24`/`25`) + "LAVIECO FIELD RESEARCH".
- **Tab chương** dạng nhãn kéo ra bên phải (Ch. 1–6), chương hiện tại Emerald + chấm Canary; còn lại nền xám nhạt.
- **Nội dung**: eyebrow "HỒ SƠ SINH THÁI HỌC", tiêu đề "Vỏ sò đến từ *đâu*", đoạn có highlight vàng nhạt, khung sơ đồ (SVG hình thái vỏ + "CALCIUM CaCO₃" + vòng tái tạo), thẻ lật "Chạm để lật mở bí mật phế phẩm", ảnh vòm + nhãn "XƯỞNG CHẾ TÁC XANH 2026", trích dẫn italic viền trái Emerald, **Ghi chú của bạn** (dòng kẻ mảnh, "Bút chì kỹ thuật số").
- **Progress đáy**: track xám + fill Emerald→Canary, chú thích chương, "Trang 24 / [Số] · 2026", "TRANG SAU →".

### 8.13 Trang chi tiết sản phẩm

Breadcrumb `← Trở về Bộ sưu tập › Bộ sưu tập › Combo quà tặng xanh › Nº [SỐ]` + badge "LƯU TRỮ HIỆN VẬT · PHÒNG TRIỂN LÃM SỐ 02"; 2 cột: trái ảnh chính vòm + 3 thumbnail vòm + badge "VẬT BẢN THỰC ĐỊA · 2026" + nút xem; phải: nhãn Nº/chất liệu, H1 Fraunces (từ *nghiêng*), giá pill, mô tả, **"Trong hộp có gì"** (lưới 2×2: icon tròn Mint + tiêu đề + mô tả; nhãn "4 THÀNH TỐ NGUYÊN BẢN"), **Story card** (nền gradient mint, trích dẫn italic, dòng meta: năm chế tác/xuất xứ/dự án), **khối QR** (QR + "Quét để mở Cẩm nang xanh số"), CTA "Chọn quà này →" + link "Đặt số lượng lớn cho doanh nghiệp →". Cuối: "Những câu chuyện *liên quan* khác" 3 card + "Xem toàn bộ tác phẩm →".

### 8.14 Trang Hợp tác (split)

Khung `rounded-xl` chia đôi: trái Deep Blue (số **04** watermark, badge "Nº 04 · ĐỒNG HÀNH & LAN TỎA" Canary, H1 "Cùng nhìn thấy giá trị ở nơi người khác chỉ thấy *rác*", 4 hàng đối tác dạng pill mờ có chấm Canary + mô tả, "Thí điểm tại Cần Thơ · 2026"), phải nền sáng: "Gửi thông tin hợp tác" + "Bắt đầu cuộc trò chuyện", chip nhóm đối tác, form 2 cột, nút gửi, "Hồ sơ đối tác di sản" / "Hệ thống giám tuyển 2026".

### 8.15 Trạng thái đặc biệt

- **404**: vòng tròn ripple đồng tâm lớn (`border secondary/5`, radial `bg-radial from-secondary` 5%), số **404** ghost `text-[18rem] md:text-[28rem]` opacity `.04`, viên ngọc Canary phát sáng trên sóng SVG xanh, nhãn `Nº 404 · LẠC LỐI BIỂN KHƠI · 2026`, H1 "Trang này đã *trôi ra biển*", phụ đề "Nhưng câu chuyện của vỏ sò vẫn còn ở đây.", nút "Về trang chủ →", chân "LAVIECO · 2026 · CẦN THƠ" giữa 2 gạch mảnh.
- **Coming soon**: viên ngọc Canary glow đỉnh, nhãn `Nº 00 · ĐANG TÁC TẠO · 2026`, H1 "Câu chuyện này đang được kể *dở*", "Sắp ra mắt." (màu `secondary`), thanh tiến độ Emerald→Canary (KHỞI NGUYÊN … 2026), ô email capsule, ghi chú, 3 metadata cột (KHÔNG GIAN *Bảo tàng xanh* · TRIỂN LÃM *LAVIECO* · NIÊN ĐẠI *2026*).

### 8.16 Footer

Mint Mist nhạt/`surface-container-low`; 4 cột; wordmark + chấm Canary + trích dẫn italic + mô tả + nhãn "Nº 001 · PHÙ SA & LÚA NƯỚC"; icon nhỏ (pin/mail/đồng hồ) cho địa chỉ, email, giờ; link MXH Facebook, TikTok; `© 2026 LAVIECO. Mọi tác quyền giáo dục và nghệ thuật được bảo lưu.`; dưới cùng chữ **LAVIECO** khổng lồ opacity ~6–8% cắt ngang đáy trang.

---

## 9. Cấu trúc trang & luồng UX

### 9.1 Site map

| Trang | Vai trò | Ghi chú |
|---|---|---|
| Landing | Trang chủ kể chuyện dài | 11 section (bảng 9.2) |
| Về chúng tôi | Thương hiệu | Trích dẫn lớn + số **01** watermark, LAVI-ECO (4 chữ L/A/V/I + hệ ECO), "Hiện thực thực địa"/"Điều chúng tôi theo đuổi", quote nền Deep Sea, 4 trụ cột hành trình (Giáo dục · Môi trường · Trải nghiệm · Cộng đồng), "Vỏ sò đến từ đâu?" (3 nguồn), 6 người kể chuyện, banner CTA |
| Chương trình "Học bằng đôi tay" | Giáo dục | Hero + 3 chỉ số (100% · 0đ · Tây Đô), 4 nấc thang accordion, thẻ đối tượng kép, form đăng ký |
| Bộ sưu tập | Catalog | Số **03** watermark, lọc chip, masonry, banner B2B Deep Blue "Bạn cần quà tặng cho doanh nghiệp hoặc sự kiện?" |
| Chi tiết sản phẩm | Hiện vật | 8.13 |
| Cẩm nang xanh số | E-book | 8.12 |
| Hợp tác | Liên hệ | 8.14 |
| Coming soon / 404 | Trạng thái | 8.15 |

**Điều hướng chính**: Câu chuyện *(Vì sao vỏ sò không phải rác)* · Chương trình *(Học bằng đôi tay)* · Bộ sưu tập *(Bằng chứng nhỏ, ý nghĩa lớn)* · Tác động *(Từ Cần Thơ ra biển lớn)*; CTA "Hợp tác cùng chúng tôi".

### 9.2 Landing — 11 section

| # | Section | Nền | Điểm nhấn |
|---|---|---|---|
| 1 | **Hero** | Soft White + scallop 30% | Badge "Đang thí điểm tại Cần Thơ" + "GREEN ART EDUCATION"; H1 "Cuộc sống, qua từng nét *nghệ thuật*." + gạch sóng SVG + số **01** watermark; 2 CTA; tem "GALLERY Nº 2024 · Mekong Estuary Pilot"; 3 vòm chồng lớp + Story Card nghiêng; marquee LAVI đáy |
| 2 | **Manifesto** | Soft White + blob mint | Câu tuyên ngôn; ~~rác~~ gạch ngang (charcoal/40, `line-through`) → *chất liệu* Emerald italic semi-bold gạch sóng Canary; caption pill |
| 3 | **Từ vỏ đến tác phẩm** | Mint Mist + scallop | 4 giai đoạn (Thu gom bản địa · Nghiền mịn & khử mùi · Đúc & tạo hình · Kể chuyện & trao ý nghĩa), khung gradient `soft-white→mint→deep-blue`, đường nét đứt Emerald `stroke-dasharray 6 6` nối 4 mốc (mốc cuối Canary), thẻ 04 Deep Blue |
| 4 | **Bốn nấc thang giá trị** | Soft White | Cẩm nang xanh số (miễn phí trọn đời) → Workshop trải nghiệm (2–3 giờ) → Gói ngoại khoá học đường (3–5 buổi/khoá) → Tài trợ giáo dục ESG |
| 5 | **Bằng chứng nhỏ, ý nghĩa lớn** | — | Móc khoá nghệ thuật vỏ sò · Décor để bàn · Bộ quà tặng xanh cao cấp |
| 6 | **Từ một chiếc vỏ đến một hệ sinh thái** | — | Mockup điện thoại Cẩm nang; "Không cần cài đặt ứng dụng"; "Chứng thư số định danh nghệ nhân"; "Kho tư liệu bài giảng cho giáo viên" |
| 7 | **Từ Cần Thơ ra biển lớn** | **Deep Sea** | 2 trụ cột (Tạo sinh kế bền vững & tự trọng · Nâng nhận thức sinh thái ven biển) + 3 chỉ số lớn |
| 8 | **Lộ trình 3 giai đoạn** | Soft White | GĐ1 minh chứng+story card+QR → GĐ2 workshop/ngoại khoá/combo B2B → GĐ3 cẩm nang freemium, app tích điểm, trạm thu gom |
| 9 | **Sáu người kể chuyện** | Soft White | Lưới 3×2 portrait vòm |
| 10 | **Liên hệ** | Deep Sea | "Cùng nhìn thấy giá trị ở nơi người khác chỉ thấy *rác*" + 2 form (Tôi là Trường học/Doanh nghiệp · Tôi muốn mang một câu chuyện về nhà) |
| 11 | **Footer** | Mint nhạt | 8.16 |

### 9.3 Luồng người dùng

1. **Khách/du khách**: Hero → Từ vỏ đến tác phẩm → Bộ sưu tập → Chi tiết → quét QR → Cẩm nang.
2. **Trường học/doanh nghiệp**: Hero CTA phụ → Chương trình (accordion + thẻ đối tượng) → Form đăng ký / Hợp tác.
3. **Đối tác nguyên liệu**: Hợp tác → chip "Nhà hàng/Quán ăn" → gửi lời nhắn.
4. **Lỗi/chưa phát hành**: 404 hoặc Coming soon → về trang chủ / để lại email.

---

## 10. Ảnh, icon & minh hoạ

- **Ảnh thật**: tông ấm, ánh sáng mềm tự nhiên; nền be/kraft/travertine; gốm bột vỏ sò màu sage, kem, xanh chàm; chân dung đội ngũ trong bối cảnh làm việc; luôn **cắt vòm** + mat-board.
- **Placeholder** (bản dựng): gradient Mint→trắng + SVG đồng tâm/sóng + chấm Canary; nội dung điền chỗ: `[Tên tác phẩm]`, `[Giá]`, `[Nội dung sẽ cập nhật]`, `Nº [số]`, `[Số trang]`.
- **Icon**: Material Symbols Outlined nét mảnh (giọt nước, sách, hộp, QR, bookmark, dark_mode/light_mode, TT cỡ chữ, chevron, edit_note, touch_app); SVG line-art stroke 1–2px cho sơ đồ; đầu mũi tên SVG `stroke-width 2` bo tròn.
- **QR**: luôn kèm câu "Quét để mở Cẩm nang xanh số".

---

## 11. Giọng văn & nội dung

- Ngôi "chúng tôi"; ẩn dụ biển/vỏ/phù sa/triển lãm ("Bước vào triển lãm", "trôi ra biển", "lạc lối biển khơi").
- **Nº** đánh số mọi hiện vật/mục/trang; nhãn `Giai đoạn 01`, `Nº 001 · Cần Thơ`, `Phòng triển lãm số 02`.
- Địa danh thật: Cần Thơ, Ninh Kiều, sông Hậu, Bến Tre, Mekong, Tây Đô, ĐBSCL.
- Tiêu đề ngắn, nhấn 1 từ italic. CTA = động từ + mũi tên ("Bước vào triển lãm →", "Chọn quà này →", "Gửi lời nhắn →").
- Triết lý cốt lõi: *"Giá trị của một thứ không nằm ở bản chất của nó, mà nằm ở cách con người trao ý nghĩa cho nó."* · *"Sản phẩm chỉ là bằng chứng, giáo dục mới là điều chúng tôi theo đuổi."* · *"Vỏ sò không phải rác — là câu chuyện tái sinh."*
- Liên hệ mẫu: `giatoc@lavieco-gallery.vn`, `curated@lavieco.art`, `(+84) 024 3828 0000`, Thứ Ba – Chủ Nhật 09:00–18:00; Quận Ninh Kiều, Cần Thơ.
- Song ngữ VI/EN (toggle ở mục lục), mặc định VI.

---

## 12. Responsive & khả năng truy cập

- **Mobile-first**: nav giữa ẩn `< md` (còn wordmark + hamburger); cursor tuỳ biến ẩn `< md`; vòm `arch-sm`; hero 40–54px; sơ đồ đường nối chỉ hiện `lg+`; grid 1 cột → `md:2` → `lg:4`.
- **Tương phản**: chữ thân Charcoal/Deep Blue trên nền sáng ≥ 4.5:1; Canary chỉ dùng trên nền tối/chấm; hạn chế chữ 8–10px cho nội dung quan trọng (chỉ nhãn phụ).
- **Focus** luôn thấy rõ (ring Emerald); nút icon có `aria-label` (vd. "Mở Mục Lục Triển Lãm"); `<details>/<summary>` cho accordion (bàn phím sẵn có); nhãn form gắn `for`; trạng thái không chỉ bằng màu.
- Dấu tiếng Việt: line-height ≥ 1.7 thân bài; tránh tracking âm ở cỡ nhỏ.
- Tôn trọng `prefers-reduced-motion` (7.6).

---

## 13. Cấu hình kỹ thuật (copy để dùng)

**Stack hiện có**: HTML tĩnh + Tailwind CDN (`cdn.tailwindcss.com`), `darkMode: "class"` ở trang con, Google Fonts.

```js
tailwind.config = {
  darkMode: "class",
  theme: { extend: {
    colors: {
      // Thương hiệu
      'emerald-brand':'#10B183','mint-mist':'#EAF8F3','deep-blue':'#20345F',
      'canary':'#E7DD6A','soft-white':'#F8FAF6','charcoal':'#1E2A32',
      // Ngữ nghĩa (Material) – xem bảng 2.2 cho đủ bộ
      'primary':'#006c4e','primary-container':'#10b183','on-primary':'#ffffff',
      'on-primary-container':'#003c2a','secondary':'#4b5d8b','secondary-container':'#b8cbff',
      'tertiary':'#676000','tertiary-fixed':'#f0e672','tertiary-fixed-dim':'#d3ca59',
      'surface':'#f8faf6','surface-container-lowest':'#ffffff','surface-container-low':'#f2f4f0',
      'surface-container':'#eceeeb','surface-container-high':'#e7e9e5','surface-container-highest':'#e1e3df',
      'on-surface':'#191c1a','on-surface-variant':'#3d4a43','outline':'#6c7a72','outline-variant':'#bbcac1',
      'on-secondary-fixed':'#011944','inverse-surface':'#2e312f','inverse-on-surface':'#eff1ed',
      'error':'#ba1a1a','error-container':'#ffdad6'
    },
    fontFamily: {
      display:['Fraunces','serif'], sans:['"Be Vietnam Pro"','sans-serif'],
      'display-hero':['Fraunces'],'headline-lg':['Fraunces'],'headline-md':['Fraunces'],
      'headline-sm':['Fraunces'],'title-editorial':['Fraunces'],
      'body-lg':['Be Vietnam Pro'],'body-md':['Be Vietnam Pro'],'body-sm':['Be Vietnam Pro'],
      'label-caps':['Be Vietnam Pro'],'metadata-curatorial':['Be Vietnam Pro']
    },
    fontSize: {
      'display-hero':['64px',{lineHeight:'76px',letterSpacing:'-0.02em',fontWeight:'400'}],
      'display-hero-mobile':['40px',{lineHeight:'48px',letterSpacing:'-0.01em',fontWeight:'400'}],
      'headline-lg':['44px',{lineHeight:'54px',letterSpacing:'-0.015em',fontWeight:'400'}],
      'headline-lg-mobile':['30px',{lineHeight:'38px',letterSpacing:'-0.01em',fontWeight:'400'}],
      'headline-md':['32px',{lineHeight:'42px',letterSpacing:'-0.01em',fontWeight:'400'}],
      'headline-sm':['24px',{lineHeight:'32px',fontWeight:'500'}],
      'title-editorial':['20px',{lineHeight:'30px',fontWeight:'400'}],
      'body-lg':['18px',{lineHeight:'31px',fontWeight:'300'}],
      'body-md':['15px',{lineHeight:'26px',fontWeight:'400'}],
      'body-sm':['13px',{lineHeight:'22px',fontWeight:'400'}],
      'label-caps':['12px',{lineHeight:'16px',letterSpacing:'0.12em',fontWeight:'600'}],
      'metadata-curatorial':['11px',{lineHeight:'16px',letterSpacing:'0.06em',fontWeight:'500'}]
    },
    borderRadius: {
      DEFAULT:'1rem', md:'1.5rem', lg:'2rem', xl:'3rem', full:'9999px',
      'arch-sm':'100px 100px 16px 16px','arch':'160px 160px 24px 24px','arch-lg':'220px 220px 32px 32px'
    },
    spacing: {
      'space-xs':'0.25rem','space-sm':'0.5rem','space-md':'1rem','space-lg':'1.75rem','space-xl':'3rem',
      'gutter':'1.5rem','gutter-tablet':'2rem','gutter-desktop':'3rem',
      'margin':'1.25rem','margin-tablet':'2.5rem','margin-desktop':'4.5rem'
    },
    letterSpacing: { museum:'0.14em' },
    boxShadow: {
      gallery:'0 24px 48px -12px rgba(32,52,95,0.08)',
      'float-dock':'0 16px 36px -8px rgba(32,52,95,0.12)',
      ambient:'0 16px 36px -12px rgba(32,52,95,0.08)',
      'ambient-hover':'0 28px 60px -16px rgba(32,52,95,0.12)'
    }
  }}
}
```

**Class nền trang**: landing `bg-soft-white text-charcoal font-sans antialiased selection:bg-mint-mist selection:text-deep-blue relative overflow-x-hidden film-grain`; trang con `bg-surface font-body-md text-body-md text-on-surface antialiased bg-ripple-pattern selection:bg-primary-container selection:text-on-secondary-fixed`.

**Z-index**: cursor `9999` · overlay mục lục & tide line `50` · dock `40` · thẻ hero chồng lớp `10 / 20 / 30 / 40` · nền trang trí `-z-0/-10`.

**Kỷ luật triển khai**
- Gom tiện ích lặp (`hairline`, `scallop-pattern`, `deep-sea-pattern`, `film-grain`, ripple, arch radius, shadow) vào **một** file CSS/token dùng chung thay vì lặp inline từng trang.
- Header/footer nên là **một** component dùng chung (hiện Tide Dock ở landing và trang con hơi khác: trang con có nhãn phụ + avatar).
- Thay toàn bộ placeholder `[...]` bằng dữ liệu thật trước khi phát hành.
- Đảm bảo font nạp trước khi render (dùng `display=swap` + preload) để tránh fallback serif như ở ảnh chụp 404/Coming soon.

---

## 14. Checklist khi thiết kế thêm trang/component mới

- [ ] Nền `#F8FAF6` (hoặc Mint/Deep Sea); không đen/trắng thuần cho nền/chữ.
- [ ] Tiêu đề Fraunces, sentence case, đúng 1 từ *italic* nhấn Emerald.
- [ ] Có nhãn `Nº` / eyebrow uppercase tracking 0.12–0.14em.
- [ ] Ảnh/khối chính đặt trong **vòm** + mat-board; nút/chip là **pill**.
- [ ] Viền hairline `rgba(32,52,95,.12)`; bóng nhuộm Deep Blue, phân tán rộng.
- [ ] Canary < 5%, chỉ chấm/badge/số Nº.
- [ ] Khoảng thở `py-32`, section đảo Deep Sea cho nội dung "sâu".
- [ ] Hover: nhấc `-8px` + zoom ảnh `1.05` + `duration-300/500`; nút `1.02/.98`.
- [ ] Có vạch tiến độ đỉnh trang; cursor pearl ở desktop; reduced-motion.
- [ ] Copy có ẩn dụ biển/triển lãm, CTA động từ + mũi tên.
- [ ] Kiểm tra mobile 4 cột, tương phản, focus ring, `aria-label`.
