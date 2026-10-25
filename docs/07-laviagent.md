# 07 — LaviAgent (bản demo)

LaviAgent là trợ lý AI tái chế sáng tạo của LAVIECO: người dùng chụp món đồ sắp vứt, AI nhận diện chất liệu, gợi ý ý tưởng DIY theo độ khó, hướng dẫn từng bước, giới thiệu DIY KIT, và trò chuyện để hỏi thêm. Bản này phục vụ Business Challenge 2026: AI thật (Gemini) cho nhận diện ảnh và chat, nội dung ý tưởng/KIT cố định trong JSON. Quyết định kiến trúc: ADR-024.

> BR-01 vẫn áp dụng: LaviAgent phục vụ giáo dục, KIT là phương tiện học, không biến LAVIECO thành cửa hàng.

## 1. Bản đồ mã nguồn

| Ở đâu | Việc |
|---|---|
| `apps/web/src/app/(site)/laviagent/page.tsx` | Trang `/laviagent` (một trang, nhiều màn) |
| `apps/web/src/app/(site)/laviagent/y-tuong/[id]/page.tsx` | Chi tiết ý tưởng, URL chia sẻ được, dựng tĩnh |
| `apps/web/src/app/api/laviagent/{analyze,chat}/route.ts` | Hai Route Handler mỏng, gọi `server/*-handler.ts` |
| `apps/web/src/features/laviagent/` | Toàn bộ tính năng (cấu trúc bên dưới) |
| `apps/web/src/shared/components/illustrations/laviagent-mascot.tsx` | Linh vật (mầm cây + tia sáng), dùng chung cho navbar, FAB, màn LaviAgent |
| `apps/web/src/features/navigation/components/laviagent-link.tsx` | Pill trên navbar + thẻ đầu drawer mobile |
| `apps/web/public/images/laviagent/{samples,ideas,kits}/` | Ảnh minh hoạ (thay bằng ảnh thật, §5) |
| `packages/ui/src/styles/theme.css` | Token `animate-agent-shimmer`, `animate-scan-sweep`, `animate-typing-dot`, utility `agent-ring` |

```
features/laviagent/
  schemas.ts · types.ts · index.ts
  constants/{text,config,icons}.ts
  data/{materials,ideas,kits,fallback-answers}.json      ← nội dung demo
  server/
    ai/ai-provider.ts                 ← interface AIProvider
    ai/{gemini,offline,lavieco-model}-provider.ts · get-provider.ts
    knowledge/knowledge-source.ts     ← interface KnowledgeSource
    knowledge/{static,handbook,composite}-knowledge-source.ts · catalog.ts
    prompts/{system-prompt,classify-prompt,build-chat-prompt}.ts
    analyze-handler.ts · chat-handler.ts · rate-limit.ts · log.ts
  hooks/use-agent-flow.ts (máy trạng thái) · use-agent-chat.ts
  utils/{parse-card-tokens,mini-markdown,sniff-image,resize-image,normalize-search-text}.ts
  components/…                        ← màn hình, thẻ, chat, FAB, section landing
```

## 2. Ba lớp

```
UI (client) ──fetch──▶ /api/laviagent/analyze ─┐
            ──useChat─▶ /api/laviagent/chat ────┤
                                                ▼
                      handler ─▶ KnowledgeSource (ý tưởng, KIT, ngữ cảnh)
                              ─▶ prompt builder (system prompt + ngữ cảnh)
                              ─▶ AIProvider (Gemini | Offline | LAVIECO model)
```

1. **`AIProvider`** — `classifyImage(image) → { material, shape, condition, confidence, safetyFlags }` và `chatStream(request) → ReadableStream<UIMessageChunk>`. UI chỉ biết route của mình và giao thức stream của AI SDK, không biết bên dưới là gì.
   - `GeminiProvider`: `generateText` + `Output.object` (Gemini chỉ được trả JSON đúng schema; `material` là enum 5 vật liệu + `unknown`), `streamText` cho chat. Gemini 2.5 tắt "thinking" (`thinkingBudget: 0`), đời sau dùng `thinkingLevel: "low"` để trả lời nhanh.
   - `OfflineProvider`: không mạng. Ảnh thật → client chuyển thẳng sang bộ chọn chất liệu với câu "Chế độ demo offline — chọn chất liệu để xem ý tưởng". Chat → câu trả lời viết sẵn của chip, câu khác nhận câu mặc định.
   - `LaviecoModelProvider`: stub, `TODO(laviagent-own-model)`.
   - Chọn bằng `get-provider.ts`: `LAVIAGENT_DEMO_MODE=offline` → offline; `LAVIAGENT_AI_PROVIDER=lavieco` → mô hình riêng; có `GEMINI_API_KEY` → Gemini; thiếu key → offline (demo không bao giờ vỡ vì thiếu bí mật).
2. **`KnowledgeSource`** — `getIdeasByMaterial`, `getIdea`, `getKits`, `getKit`, `searchContext(query, material)`. Hiện tại `StaticKnowledgeSource` (JSON, so khớp từ khoá không dấu). `HandbookKnowledgeSource` là stub (`TODO(laviagent-rag)`). `CompositeKnowledgeSource` gộp các nguồn: tra theo id lấy nguồn đầu tiên có, ngữ cảnh nối theo thứ tự rồi cắt còn 6 đoạn.
3. **Prompt builder** — `prompts/system-prompt.ts` (giọng "mình – bạn", phạm vi, an toàn, chỉ giới thiệu KIT có trong danh sách, không bịa giá/địa chỉ, cú pháp thẻ `[[idea:<id>]]`/`[[kit:<id>]]`); `build-chat-prompt.ts` ghép thêm ngữ cảnh: vật liệu đang xem, ý tưởng đang mở, ý tưởng liên quan, tư liệu từ `searchContext`, danh sách KIT. Lịch sử chat đi riêng dạng messages, **chỉ 10 tin gần nhất**, chỉ ảnh của tin mới nhất được gửi lại.

## 3. API

| Route | Vào | Ra |
|---|---|---|
| `POST /api/laviagent/analyze` | multipart, trường `image` (JPEG/PNG/WebP theo magic bytes, ≤ 3 MB sau khi client thu nhỏ) | `{status:"ok", result}` · `{status:"offline"}` · `{status:"error", reason: invalid_image \| too_large \| rate_limited \| timeout \| unavailable}` |
| `POST /api/laviagent/chat` | Giao thức `useChat` (`messages`) + `context: { material?, ideaId? }`; tin cuối ≤ 500 ký tự, tối đa 1 ảnh (data URL) | UI message stream (SSE). Lỗi: JSON `{status:"error", reason}` (400/429) |

- `confidence < 0.55` → `unknown` (trừ khi `hazardous`). Đồ nguy hại (pin, bóng đèn, thủy tinh vỡ, rác y tế, hoá chất) → `safetyFlags.hazardous = true`, UI từ chối lịch sự + mẹo chung.
- Hết 8 giây → `timeout`; client cũng tự huỷ ở 8 giây và đưa ra bộ chọn thủ công + ảnh mẫu.
- Giới hạn trong bộ nhớ: chat 20 tin/phiên/ngày và 60 tin/IP/giờ; phân tích 15 ảnh/phiên và 40 ảnh/IP mỗi 10 phút. Phiên = cookie `lv_agent` (UUID ngẫu nhiên, httpOnly, `Path=/api/laviagent`). Chặn POST từ origin khác (không cho trang khác tiêu hạn mức).
- **Không lưu ảnh, không log ảnh hay nội dung chat.** Log chỉ có `provider` và tên lỗi.

## 4. Màn hình và dự phòng khi demo

Home (tải ảnh, chụp ảnh bằng `capture="environment"`, chip vật liệu, ảnh mẫu, 4 bước) → Xem lại ảnh → Đang phân tích → Kết quả (thẻ chất liệu, an toàn, tiềm năng tái chế, lọc độ khó, ý tưởng, KIT, workshop) → Chi tiết ý tưởng (`/laviagent/y-tuong/[id]`). Chat: desktop chia đôi, mobile là bottom sheet. Trạng thái biên: không nhận diện được, ảnh lỗi/quá lớn/HEIC, đồ nguy hại, mất mạng, vượt giới hạn.

Dự phòng: **ảnh mẫu** trả kết quả cố định không gọi API; analyze lỗi/timeout → bộ chọn thủ công + ảnh mẫu; **chip gợi ý** luôn có, chat lỗi thì chip trả câu viết sẵn (`fallback-answers.json`, ghi "Câu trả lời soạn sẵn"); `LAVIAGENT_DEMO_MODE=offline` chạy hoàn toàn không mạng.

Trên toàn site: pill "LaviAgent · AI" trên navbar (cạnh nút Hợp tác, viền gradient Emerald → Canary chạy nhẹ), thẻ đầu drawer mobile, FAB "Hỏi LaviAgent" góc phải dưới (ẩn ở `/laviagent`, thanh toán, vé, đăng nhập/đăng ký), section ngay sau Hero trên trang chủ. Mọi chuyển động tắt khi `prefers-reduced-motion`.

Mini card "Gợi ý từ LaviAgent" trên trang sản phẩm/KIT: **chưa làm** vì chưa có trang sản phẩm (`/bo-suu-tap` đang "sắp ra mắt"). `productUrl` của KIT tạm trỏ `/bo-suu-tap` (`TODO(laviagent-kit-page)`).

## 5. Thay nội dung demo

Mọi tệp ở `apps/web/src/features/laviagent/data/` đều được kiểm tra bằng Zod lúc build và bằng test `catalog.spec.ts` (`npx turbo run test --filter=@lavieco/web`). Sửa sai định dạng thì build/test báo lỗi, không lọt ra người xem.

- `materials.json`: 5 vật liệu cố định (`plastic_bottle`, `aluminum_can`, `paper_box`, `glass_jar`, `shell`). Thêm vật liệu mới cần sửa `MATERIAL_IDS` trong `schemas.ts` và prompt phân loại.
- `ideas.json`: `id` là slug URL (không đổi sau khi đã chia sẻ), `difficulty` ∈ `easy|medium|advanced`, `kitId` phải có trong `kits.json`. Mỗi vật liệu 2–3 ý tưởng (test kiểm tra).
- `kits.json`: giá là số nguyên VND, hiển thị kèm "Giá tham khảo; giá chốt do đội LAVIECO xác nhận" (BR-10).
- `fallback-answers.json`: chip gợi ý + câu trả lời viết sẵn; được dùng thẻ `[[idea:<id>]]`, `[[kit:<id>]]` (test kiểm tra id có thật).

**Ảnh thật thay ảnh minh hoạ** — giữ đúng tên tệp, JPEG, nền gọn, món đồ ở giữa, không có người/khuôn mặt:

| Tệp | Tỉ lệ | Kích thước khuyến nghị |
|---|---|---|
| `public/images/laviagent/samples/plastic-bottle.jpg`, `aluminum-can.jpg`, `paper-box.jpg`, `glass-jar.jpg`, `shell.jpg` | 4:5 dọc | 800 × 1000 px, ≤ 200 KB |
| `public/images/laviagent/ideas/<id ý tưởng>.jpg` (13 tệp, tên = `id` trong `ideas.json`, riêng `ong-but-chu-heo.jpg`) | 4:3 | 1200 × 900 px, ≤ 250 KB |
| `public/images/laviagent/kits/<id KIT>.jpg` (4 tệp) | 16:10 | 1200 × 750 px, ≤ 250 KB |
| Ảnh từng bước (tuỳ chọn, trường `steps[].image`) | 16:10 | 1200 × 750 px |

Đổi ảnh thì nên đổi tên tệp (cache của `next/image`) và cập nhật đường dẫn trong JSON.

## 6. Lộ trình nâng cấp

1. **Cẩm nang xanh số (nội dung)** — `content-service` xuất bản chương Cẩm nang (đã có trong `docs/01`, BR-03). Chưa cần AI.
2. **RAG trên Cẩm nang** (`TODO(laviagent-rag)`, `handbook-knowledge-source.ts`):
   - Job chia mỗi trang đã xuất bản thành đoạn ~300–500 token, giữ `chapterId`, `pageId`, `revision`, `accessLevel`, thẻ vật liệu.
   - Tạo embedding (Gemini hoặc mô hình riêng), lưu vào collection `handbook_chunks` với chỉ mục **MongoDB Atlas Vector Search** (đã dùng Atlas).
   - Đánh lại chỉ mục theo outbox xuất bản của `content-service`; chỉ nội dung `published` (S3).
   - `searchContext` nhúng câu hỏi, chạy `$vectorSearch` (lọc vật liệu, `accessLevel`), trả đoạn kèm nguồn. Thêm vào `CompositeKnowledgeSource` là xong; prompt đã có mục "Tư liệu tham khảo". Lúc này tách `laviagent-service` (ADR-024).
3. **Mô hình riêng của LAVIECO** (`TODO(laviagent-own-model)`, `lavieco-model-provider.ts`):
   - Phân loại ảnh: fine-tune trên ảnh đội gán nhãn (5 vật liệu + đồ nguy hại); có thể giữ Gemini làm dự phòng.
   - Chat: mô hình nhỏ đã tinh chỉnh theo giọng LaviAgent, phục vụ qua endpoint tương thích OpenAI (vLLM/llama.cpp/Ollama) trên mạng riêng; `streamText` + `@ai-sdk/openai-compatible` + `toUIMessageStream` như `GeminiProvider`.
   - Đặt `LAVIAGENT_AI_PROVIDER=lavieco`. Không sửa UI hay route.
4. **Lịch sử & tác động cá nhân** (`TODO(laviagent-history)`, đã có thiết kế Stitch) — cần tài khoản member, đồng ý, DB; không thu thông tin học sinh (BR-08).

## 7. Cấu hình Gemini

1. Vào **Google AI Studio** (`https://aistudio.google.com`), đăng nhập tài khoản Google của đội.
2. Chọn **Get API key** → **Create API key** (chọn hoặc tạo một Google Cloud project riêng cho LAVIECO; dev và prod nên là hai project/khoá khác nhau).
3. Dán vào `apps/web/.env.local`: `GEMINI_API_KEY=...` (không commit, không gửi qua chat). Production: `/opt/lavieco/env/web.env`.
4. `GEMINI_MODEL` mặc định `gemini-2.5-flash`. **Bị giới hạn tần suất (lỗi 429, LaviAgent báo "đang bận") thì đổi `GEMINI_MODEL` sang bản Flash-Lite** (ví dụ `gemini-2.5-flash-lite`) rồi khởi động lại `web`. Danh sách model và hạn mức miễn phí xem trong AI Studio; Google đổi model theo thời gian.
5. Không có mạng khi thuyết trình: `LAVIAGENT_DEMO_MODE=offline`.

**Lưu ý dữ liệu:** ở gói miễn phí, Google có thể dùng nội dung gửi lên (ảnh, câu hỏi) để cải thiện sản phẩm của họ. Với người dùng thật (nhất là học sinh), cân nhắc gói trả phí hoặc mô hình riêng trước khi mở rộng; trang đã ghi rõ ảnh không được LAVIECO lưu lại.
