# ADR-013: Thư viện chuyển động `motion` và biểu tượng thương hiệu

| | |
|---|---|
| **Trạng thái** | Đề xuất (chờ duyệt) |
| **Ngày** | 21/09/2026 |
| **Người đề xuất** | V.C. Trọng |
| **Liên quan** | `docs/04` mục 5.4 (icon, chuyển động), `CLAUDE.md` mục 8 và 16 |

## Bối cảnh

Modal "hồ sơ người kể chuyện" (section Sáu người kể chuyện) cần chuyển cảnh phần tử dùng chung: ảnh ở lưới phóng lên thành khung ảnh của modal rồi bay về khi đóng, kèm bo góc đổi dạng, xuất hiện lần lượt (stagger), vẽ nét (stroke) và vuốt để đóng. Làm bằng CSS thuần và JS tay sẽ dài và khó giữ 60fps. Ngoài ra hàng liên hệ cần logo thương hiệu thật (Facebook, Zalo, GitHub, LinkedIn, Behance), mà bộ Feather (`react-icons/fi`) không có.

## Quyết định

1. **Thêm `motion`** (Framer Motion, import từ `motion/react`) cho `apps/web`. Dùng cho: chuyển cảnh bố cục (`layout`), stagger, drag, `pathLength`. Chỉ animate `transform`/`opacity`/`clip-path`. Mọi hiệu ứng vẫn phải tôn trọng `prefers-reduced-motion` (`useReducedMotion`).
2. **Cho phép biểu tượng thương hiệu** từ `react-icons/si` và `react-icons/fa6`, **chỉ trong `src/features/team/`**, và chỉ cho logo mạng xã hội/kênh liên hệ. Mọi nơi khác vẫn chỉ dùng `react-icons/fi`. Luật ESLint `no-restricted-imports` được nới theo đúng phạm vi này (`restrictedImports({ brandIcons: true })` ở `@lavieco/config`). Đây là ngoại lệ có quản lý cho PQ2, không thêm thư viện icon mới (vẫn là `react-icons`).

## Hệ quả

- `motion` chỉ được nạp ở client component của tính năng dùng nó; không dùng trong Server Component.
- Bundle của trang chủ tăng thêm phần `motion`; cần theo dõi Core Web Vitals (INP) khi mở modal. Nếu ảnh hưởng đáng kể, nạp modal bằng `next/dynamic` sau khi trang chính đã sẵn sàng.
- Thêm biểu tượng thương hiệu mới ở tính năng khác cần mở rộng ADR này, không tự nới luật lint.
