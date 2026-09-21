# ADR-012: Định dạng module của các gói dùng chung

| | |
|---|---|
| **Trạng thái** | Đề xuất (chờ duyệt) |
| **Ngày** | 21/09/2026 |
| **Người đề xuất** | V.C. Trọng |
| **Liên quan** | `docs/04` mục 3 và 4, `docs/02` mục 3.4 |

## Bối cảnh

Các gói trong `packages/` được hai loại người dùng khác nhau:

- **Ứng dụng Next.js** (`web`, `admin`): dùng ESM, có bước biên dịch riêng và có thể tự biên dịch TypeScript của gói qua `transpilePackages`.
- **Service NestJS**: mặc định CJS, chạy mã đã biên dịch; không tự biên dịch mã TypeScript của gói khác.

Bản đầu của `docs/04` §3 yêu cầu **mọi** gói phát hành cả ESM và CJS bằng `tsup`. Khi dựng landing, `packages/ui` chỉ có người dùng là app Next.js và chứa `theme.css` (Tailwind `@source` cần quét mã nguồn), nên bước build kép là chi phí không mang lại lợi ích.

## Quyết định

Chia hai nhóm:

1. **Gói mà service dùng** (`shared`, `api-clients`, `service-kit`, `observability`): build **ESM + CJS** bằng `tsup`, kèm `exports` map (có điều kiện `import`/`require` và `types`).
2. **`packages/ui`**: **xuất thẳng mã nguồn TypeScript**, chỉ được dùng bởi các app Next.js.
   - Mỗi app khai báo `transpilePackages: ["@lavieco/ui"]` trong `next.config.ts`.
   - `exports` map của `ui` **vẫn trỏ tới `src`**: `"."` → `./src/index.ts`, `"./theme.css"` → `./src/styles/theme.css`.
   - **Service không được import `@lavieco/ui`** (`ui` phụ thuộc React và CSS).
   - `theme.css` dùng `@source "../"` để Tailwind quét mã của `ui` (Tailwind không tự quét gói workspace qua symlink).

**Luật cấm import sâu vẫn giữ nguyên** cho mọi gói, kể cả `ui`: chỉ import qua điểm vào khai báo trong `exports` (`@lavieco/ui`, `@lavieco/ui/theme.css`); cấm `@lavieco/ui/src/...`. Luật ESLint (`no-restricted-imports`, mẫu `@lavieco/*/src`) chặn điều này.

## Hệ quả

- Ít bước build hơn ở `ui`; sửa component thấy ngay ở `next dev`.
- `ui` gắn chặt với Next.js. Nếu sau này cần dùng `ui` ngoài Next.js (Storybook, ứng dụng khác), phải bổ sung bước build hoặc cấu hình biên dịch tương ứng, và cập nhật ADR này.
- Nhóm (1) vẫn cần `tsup` và kiểm tra cả hai định dạng ở CI khi các gói đó được tạo (bước 2 của lộ trình `docs/04` §15).
- Turborepo: `build` của `ui` không tạo đầu ra; `typecheck`, `lint` của `ui` vẫn chạy.
