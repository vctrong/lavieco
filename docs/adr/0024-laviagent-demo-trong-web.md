# ADR-024: LaviAgent bản demo chạy trong `web`, gọi AI qua Vercel AI SDK

| | |
|---|---|
| **Trạng thái** | Đề xuất (Proposed). Chờ đội duyệt |
| **Ngày** | 25/10/2026 |
| **Người đề xuất** | V.C. Trọng |
| **Liên quan** | `docs/07-laviagent.md`; `docs/06` (biến `LAVIAGENT_*`, `GEMINI_*`); `docs/02` §14.1 (điều kiện thêm service); ADR-022 (một VPS) |

## Bối cảnh

LaviAgent là trợ lý AI tái chế sáng tạo, trọng tâm hồ sơ dự thi Business Challenge 2026 (Tài liệu định vị v1.3, mục 3.5). Cần một bản demo chạy thật: nhận diện ảnh và chat bằng mô hình AI có sẵn (Gemini, gói miễn phí), nội dung ý tưởng/KIT cố định trong JSON. Kiến trúc phải chừa đường cho (a) RAG trên Cẩm nang xanh số và (b) mô hình riêng của LAVIECO.

Repo có luật: logic nghiệp vụ ở service, `web` chỉ là BFF (CLAUDE.md §5). Một service mới cần đủ điều kiện ở `docs/02` §14.1 và một ADR.

## Quyết định

1. **Bản demo nằm trọn trong `apps/web`**: `features/laviagent` + hai Route Handler `POST /api/laviagent/analyze` và `POST /api/laviagent/chat`. Không DB, không lưu ảnh, không thu PII, nên không vi phạm ranh giới dữ liệu. Đây là ngoại lệ có thời hạn, chỉ cho demo.
2. **Module viết để dời đi được**: `server/` không phụ thuộc Next (chỉ `Request`/`Response` chuẩn, `lib/env`, logger), tách 3 lớp qua interface: `AIProvider` (`classifyImage`, `chatStream`), `KnowledgeSource` (`getIdeasByMaterial`, `getIdea`, `getKits`, `getKit`, `searchContext`), prompt builder. Hợp đồng Zod ở `features/laviagent/schemas.ts`; chuyển sang `@lavieco/shared` cùng lúc với việc tách service.
3. **Thư viện**: `ai` 7.0.153, `@ai-sdk/google` 4.0.105, `@ai-sdk/react` 4.0.157 (ghim bản cố định, `@ai-sdk/react` ghim đúng bản `ai`). Lý do: giao thức UI message stream + `useChat` dùng được cho mọi provider; một mô hình tự host có thể sinh cùng luồng chunk (`createUIMessageStream`) mà không sửa client.
4. **Chọn provider qua env**: `LAVIAGENT_AI_PROVIDER` (`gemini`; `lavieco` là stub), `GEMINI_MODEL` (mặc định `gemini-3.8-flash`; tên model đổi theo thời gian, `docs/07` §7), `GEMINI_API_KEY` chỉ ở server. `LAVIAGENT_DEMO_MODE=offline` hoặc thiếu key thì dùng `OfflineProvider` (dữ liệu cố định, không mạng).
5. **Giới hạn tần suất trong bộ nhớ** (theo phiên ẩn danh + IP), đủ cho một instance (ADR-022). Cookie `lv_agent` là UUID ngẫu nhiên, httpOnly, chỉ để đếm, không định danh ai.
6. **Ảnh**: client thu nhỏ còn ~1024 px JPEG (canvas, mất luôn EXIF); server kiểm tra magic bytes JPEG/PNG/WebP, ≤ 3 MB, chỉ giữ trong bộ nhớ trong lúc gọi mô hình. Ảnh gửi sang Google (máy chủ ngoài nước, cùng loại chấp nhận như Cloudinary ở ADR-020, AQ4 vẫn mở); trang ghi rõ "Ảnh chỉ dùng để phân tích, không được lưu lại".

7. **Chat-first, card do client tạo** (quyết định 25/10/2026): `/laviagent` là khung chat (nhóm route `(agent)`, không footer). Card kết quả phân tích ảnh, ảnh mẫu, chip chất liệu là data part do client tạo từ `/analyze` hoặc dữ liệu cố định, không dùng tool calling: nhanh, chạy được offline, không tốn lượt gọi mô hình. Server đổi card thành dòng tóm tắt khi đưa lịch sử cho mô hình.
8. **Lịch sử trò chuyện chỉ trên thiết bị** (`ChatHistoryStore` → `LocalChatHistoryStore`, localStorage, ≤ 30 cuộc, ≤ 60 tin/cuộc, ảnh chỉ còn thumbnail ~96px). Đồng bộ theo tài khoản là `TODO(laviagent-server-history)`.

## Điều kiện để tách thành `laviagent-service`

Một trong các điều kiện sau thì dựng service theo `docs/04` §13.3 (cổng nội bộ, service token từ `web`, database riêng):
- Bật RAG trên Cẩm nang (cần index vector, đồng bộ theo outbox xuất bản của `content-service`).
- Lưu lịch sử/tác động cá nhân (cần tài khoản member, đồng ý, DB).
- Chạy mô hình riêng hoặc cần giới hạn tần suất dùng chung giữa nhiều instance.

## Hệ quả

- (+) Demo chạy được ngay, không thêm hạ tầng; đổi mô hình chỉ đổi env + một lớp provider.
- (+) UI không biết bên dưới là Gemini hay mô hình riêng.
- (−) `web` tạm chứa logic không phải BFF; bộ đếm tần suất mất khi khởi động lại; ảnh rời khỏi Việt Nam khi phân tích.
- (−) Thêm ~3 gói phụ thuộc cho `web`.
