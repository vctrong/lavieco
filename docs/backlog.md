# Backlog kỹ thuật

Việc đã khảo sát, cố ý **không** làm trong PR phát hiện ra nó, để làm thành PR riêng. Mỗi mục ghi nguồn gốc, phạm vi và mã `TODO(...)` trong code (nếu có).

## B1. Chuyển `apps/web` sang `cacheComponents` (PPR)

- **Nguồn:** PR navbar mới (2026-10). Navbar cần biết ai đang xem mà không làm cả layout `(site)` chuyển sang render động. Tạm thời đã giải bằng client island + `GET /api/account/viewer`.
- **Mục tiêu:** bật `cacheComponents: true` trong `apps/web/next.config.ts`. Shell của navbar (và các trang) giữ static, cụm tài khoản đọc session ở server bên trong `<Suspense>` với skeleton đúng kích thước. Khi xong có thể bỏ endpoint viewer, hoặc giữ lại chỉ để đồng bộ phía client.
- **Mốc trước khi chuyển** (`next build`, Next 16.3.5): trong `(site)` chỉ có `/`, `/chuong-trinh/truong-hoc`, `/_not-found` là static. `/sap-ra-mat` (ngoài `(site)`) cũng static.
- **Khảo sát** (bật thử rồi chạy `next build --debug-prerender`): **12/13 route của `(site)` lỗi build.**

| Nguyên nhân | Chỗ cần sửa |
|---|---|
| Route segment config `dynamic = "force-dynamic"` không còn được phép | `app/(site)/xem-truoc/chuong-trinh/[token]/page.tsx` |
| `new Date()` lúc prerender | `features/navigation/components/footer.tsx` (năm bản quyền, nằm trong layout nên làm hỏng mọi trang), `features/home/components/handbook-preview.tsx` |
| Dữ liệu runtime ngoài `<Suspense>` (`params`, `searchParams`, `cookies()`, `headers()` qua `requestId()`, `connection()`) | `/chuong-trinh`, `/chuong-trinh/[slug]`, `/chuong-trinh/[slug]/dang-ky`, `/chuong-trinh/thanh-toan/[token]`, `/ve/[token]`, `/xem-truoc/chuong-trinh/[token]`, `/dang-ky`, `/dang-nhap`, `/quen-mat-khau`, `/tra-cuu-ve`, `/tai-khoan` |
| `usePathname()` trong client component của layout ngoài `<Suspense>` | Các component của navigation (`NavLinks`, `NavDropdown`, `MobileDrawer`, `NavbarShell`) |
| `unstable_cache` ở `features/events/server/events.ts` | Vẫn chạy được, nhưng nên chuyển sang `"use cache"` + `cacheTag`/`cacheLife`, rồi kiểm tra lại `/api/revalidate` (`revalidateTag(tag, "max")`) |

- **Kiểm chứng:** bảng static/dynamic trước và sau; test webhook revalidate với tag `program:events`/`program:events:<slug>`; không có layout shift ở cụm tài khoản.

## B2. Cửa sổ ân hạn chống "reuse" khi xoay refresh token (identity-service)

- **Nguồn:** PR navbar mới (2026-10), `TODO(session-refresh-grace)` ở `apps/web/src/features/navigation/hooks/viewer-store.ts`.
- **Vấn đề:** `SessionService.refresh` (`services/identity-service/src/modules/sessions/application/session-service.ts`) coi mọi lần dùng lại một refresh token đã xoay là bị đánh cắp, nên **thu hồi cả family**. Hai request xoay song song (nhiều tab, hoặc server và trình duyệt cùng lúc) sẽ làm người dùng bị đăng xuất oan. Lỗi này `/api/auth/refresh` đang có sẵn.
- **Hiện trạng giảm nhẹ:** trên trình duyệt, navbar xoay token dưới Web Lock `lavieco-auth-refresh` (mỗi lúc chỉ một tab) và hỏi lại viewer trước khi xoay. Cách này **không** chặn được request song song từ server hay từ thiết bị khác.
- **Hướng sửa gốc:** token vừa xoay trong N giây (cấu hình được) mà bị dùng lại thì từ chối bằng một mã lỗi riêng, **không** thu hồi family. BFF gặp mã đó thì không xoá cookie. Cần cập nhật `docs/03` §4.2, thêm mã lỗi ở `shared`, và test domain cho `decideRefresh`.

## B3. Cờ admin cho thành viên trên `web`

- **Nguồn:** PR navbar mới, `TODO(nav-admin-flag)` ở `apps/web/src/features/navigation/server/get-viewer.ts`.
- **Vấn đề:** `MemberProfile` không cho biết thành viên có được mở trang quản trị hay không. Staff đăng nhập riêng ở `apps/admin`.
- **Việc cần làm:** quyết định nguồn của cờ này (hợp đồng `shared` + identity-service, docs/01 §4.4), rồi chỉ cần sửa `getViewer()` để trả `{ kind: "admin", ..., adminUrl }`. Giao diện admin của navbar đã dựng sẵn.

## B4. Trang tài khoản còn thiếu

- **Nguồn:** PR navbar mới, `TODO(nav-account-routes)` ở `apps/web/src/features/navigation/constants/config.ts`.
- `/tai-khoan/ve` (Vé của tôi) và `/tai-khoan/chuong-trinh` (Chương trình đã đăng ký): menu tài khoản đã trỏ tới hai đường dẫn này nhưng trang chưa có.

## B5. Báo lỗi theo cách chung cho các panel admin

- **Nguồn:** PR làm lại trang Chương trình + báo lỗi form (22/10/2026). Phạm vi PR đó dừng ở form auth của web/admin, checkout, tra cứu vé, form lead.
- **Hiện trạng:** 9 chỗ trong admin đã bỏ `.catch(() => null)` (gọi qua `callAction`, lỗi đúng loại, "bận" kèm mã tham chiếu) nhưng **chưa** có dấu `*` (`required`), dòng "Còn N mục…" + vùng đọc ẩn, focus trường lỗi đầu tiên và kiểm tra lại khi gõ: `features/events/components/{details-form,form-builder,ticket-types-section,status-panel,cancel-event-panel,event-types-page}.tsx`, `features/ticketing/components/{checkin-scanner,order-actions,export-panel}.tsx`.
- **Việc cần làm:** dùng `useFormErrors` + `FormErrorNote`/`RequiredNote` của `@lavieco/ui` như các form auth (`docs/04` §5.5). `details-form` dài và nhiều mục lặp lại: cần quyết định khoá trường cho mục lặp (vd `speakers.0.name`) trước khi làm.
- **Câu lỗi tiếng Anh:** các panel này kiểm tra bằng schema hợp đồng của `packages/shared`, vốn có câu riêng bằng tiếng Anh (vd "End must be after start", "Sale end must be after sale start", "Lower-case letters, digits and single dashes"). Câu đặt riêng thắng `src/shared/zod-vi.ts`, nên vẫn lộ ra ở admin. Cần ánh xạ theo đường dẫn trường sang câu tiếng Việt ở admin (không đổi câu của hợp đồng, service dùng chúng).

## B6. Gom phần báo lỗi form đang trùng giữa `web` và `admin`

- **Nguồn:** cùng PR trên.
- **Hiện trạng:** bản sao giống nhau ở hai app: `src/shared/call-action.ts`, `src/shared/form-failures.ts`, `src/shared/constants/form-text.ts`, `src/shared/components/failure-alert.tsx`, `src/lib/action-errors.ts` (kèm spec). Không để ở `@lavieco/ui` vì `call-action` dùng `next/navigation` (`unstable_isUnrecognizedActionError`) và `action-errors` dùng `@lavieco/api-clients`, mà `ui` không phụ thuộc hai gói này.
- **Việc cần làm:** chọn chỗ chung theo `docs/04` §4 (vd. một export con kiểu `@lavieco/ui/next` có peer dependency `next`, hoặc `@lavieco/service-kit` cho phần server), kiểm tra `npm run deps:check` cho phép, rồi xoá bản sao. Phần `form-failures`/`form-text` không phụ thuộc gì có thể chuyển trước.
