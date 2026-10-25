# 07 — LaviAgent (bản demo)

LaviAgent là trợ lý AI tái chế sáng tạo của LAVIECO: người dùng chụp món đồ sắp vứt, AI nhận diện chất liệu, gợi ý ý tưởng DIY theo độ khó, hướng dẫn từng bước, giới thiệu DIY KIT, và trò chuyện để hỏi thêm. Bản này phục vụ Business Challenge 2026: AI thật (Gemini) cho nhận diện ảnh và chat, nội dung ý tưởng/KIT cố định trong JSON. Quyết định kiến trúc: ADR-024.

> BR-01 vẫn áp dụng: LaviAgent phục vụ giáo dục, KIT là phương tiện học, không biến LAVIECO thành cửa hàng.

## 1. Bản đồ mã nguồn

| Ở đâu | Việc |
|---|---|
| `apps/web/src/app/(agent)/laviagent/page.tsx` + `(agent)/layout.tsx` | Trang chat `/laviagent`: navbar gọn (`compact`), không footer, không FAB, cao 100dvh |
| `apps/web/src/app/(site)/laviagent/y-tuong/[id]/page.tsx` | Chi tiết ý tưởng, URL chia sẻ được, dựng tĩnh |
| `apps/web/src/app/api/laviagent/{analyze,chat}/route.ts` | Hai Route Handler mỏng, gọi `server/*-handler.ts` |
| `apps/web/src/features/laviagent/` | Toàn bộ tính năng (cấu trúc bên dưới) |
| `apps/web/src/shared/components/illustrations/laviagent-mascot.tsx` | Linh vật (mầm cây + tia sáng), dùng chung cho navbar, FAB, màn LaviAgent |
| `apps/web/src/shared/components/illustrations/shell-icon.tsx` | Icon vỏ sò theo lưới Feather (Feather không có vỏ sò) |
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
  hooks/use-conversation.ts          ← một cuộc trò chuyện: Chat + card do client tạo + phục hồi lỗi
  utils/chat-history-store.ts        ← type ChatHistoryStore (+ TODO ServerChatHistoryStore)
  utils/local-chat-history-store.ts  ← lưu localStorage
  utils/{group-by-date,conversation-title,infer-material,parse-card-tokens,mini-markdown,sniff-image,resize-image,normalize-search-text}.ts
  components/laviagent-app.tsx       ← khung: sidebar lịch sử, cuộc trò chuyện, drawer
  components/chat/{conversation-view,composer,empty-state,message-bubble,analyzing-bubble,…}.tsx
  components/{cards,history,idea-*,kit-card,material-chips,sample-gallery,intro-section,laviagent-fab}.tsx
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
   - `GeminiProvider`: `generateText` + `Output.object` (Gemini chỉ được trả JSON đúng schema; `material` là enum 5 vật liệu + `unknown`), `streamText` cho chat. Gemini 2.5 tắt "thinking" (`thinkingBudget: 0`), đời sau dùng `thinkingLevel: "low"` để trả lời nhanh. Ảnh gửi cho mô hình là `file` part có `mediaType: image/*` (kiểu `image` part đã bị AI SDK đánh dấu lỗi thời).
   - `OfflineProvider`: không mạng. Ảnh thật → client chuyển thẳng sang bộ chọn chất liệu với câu "Chế độ demo offline — chọn chất liệu để xem ý tưởng". Chat → câu trả lời viết sẵn của chip, câu khác nhận câu mặc định.
   - `LaviecoModelProvider`: stub, `TODO(laviagent-own-model)`.
   - Chọn bằng `get-provider.ts`: `LAVIAGENT_DEMO_MODE=offline` → offline; `LAVIAGENT_AI_PROVIDER=lavieco` → mô hình riêng; có `GEMINI_API_KEY` → Gemini; thiếu key → offline (demo không bao giờ vỡ vì thiếu bí mật).
2. **`KnowledgeSource`** — `getIdeasByMaterial`, `getIdea`, `getKits`, `getKit`, `searchContext(query, material)`. Hiện tại `StaticKnowledgeSource` (JSON, so khớp từ khoá không dấu). `HandbookKnowledgeSource` là stub (`TODO(laviagent-rag)`). `CompositeKnowledgeSource` gộp các nguồn: tra theo id lấy nguồn đầu tiên có, ngữ cảnh nối theo thứ tự rồi cắt còn 6 đoạn.
3. **Prompt builder** — `prompts/system-prompt.ts` (giọng "mình – bạn", phạm vi, an toàn, chỉ giới thiệu KIT có trong danh sách, không bịa giá/địa chỉ, cú pháp thẻ `[[idea:<id>]]`/`[[kit:<id>]]`); `build-chat-prompt.ts` ghép thêm ngữ cảnh: vật liệu đang xem, ý tưởng đang mở, ý tưởng liên quan, tư liệu từ `searchContext`, danh sách KIT. Lịch sử chat đi riêng dạng messages, **chỉ 10 tin gần nhất**. Client thay ảnh bằng chữ `[Ảnh món đồ]` trước khi gửi; card kết quả (data part) được server đổi thành một dòng tóm tắt ("đã nhận diện chất liệu: …"), các lượt liên tiếp cùng vai được gộp. Chất liệu: `context.material` (card mới nhất) hoặc suy ra từ lời người dùng bằng `keywords` trong `materials.json` (`infer-material.ts`, ví dụ "lon bia" → lon nhôm); prompt nói rõ chất liệu đã biết thì không hỏi lại.

## 3. API

| Route | Vào | Ra |
|---|---|---|
| `POST /api/laviagent/analyze` | multipart, trường `image` (JPEG/PNG/WebP theo magic bytes, ≤ 3 MB sau khi client thu nhỏ) | `{status:"ok", result}` · `{status:"offline"}` · `{status:"error", reason: invalid_image \| too_large \| rate_limited \| timeout \| unavailable}` |
| `POST /api/laviagent/chat` | Giao thức `useChat` (`messages`, gồm cả data part `data-analysis`/`data-hazard`) + `context: { material?, ideaId? }`; tin cuối ≤ 500 ký tự | UI message stream (SSE). Lỗi: JSON `{status:"error", reason}` (400/429); lỗi model giữa stream là chunk `error` cùng dạng JSON |

- `confidence < 0.55` → `unknown` (trừ khi `hazardous`). Đồ nguy hại (pin, bóng đèn, thủy tinh vỡ, rác y tế, hoá chất) → `safetyFlags.hazardous = true`, UI từ chối lịch sự + mẹo chung.
- Hết 8 giây → `timeout`; client cũng tự huỷ ở 8 giây và đưa ra bộ chọn thủ công + ảnh mẫu.
- Giới hạn trong bộ nhớ: chat 20 tin/phiên/ngày và 60 tin/IP/giờ; phân tích 15 ảnh/phiên và 40 ảnh/IP mỗi 10 phút. Phiên = cookie `lv_agent` (UUID ngẫu nhiên, httpOnly, `Path=/api/laviagent`). Chặn POST từ origin khác (không cho trang khác tiêu hạn mức).
- **Không lưu ảnh, không log ảnh hay nội dung chat.** Log chỉ có `provider` và tên lỗi.

## 4. Màn hình và dự phòng khi demo

### 4.1 Chat-first

`/laviagent` là một khung chat kiểu ChatGPT/Gemini: vào là chat được ngay, không bắt buộc chụp ảnh. Ô nhập cố định ở đáy (chọn ảnh, chụp ảnh `capture="environment"`, gửi), có `safe-area`; khung chính bám theo `visualViewport` (iOS) và `interactiveWidget: resizes-content` (Android) để bàn phím ảo không che ô nhập.

- **Trạng thái trống** (chưa có tin): lời chào linh vật, khu kéo-thả/chụp ảnh và ảnh mẫu đặt cạnh nhau trên desktop (rộng `max-w-5xl`, là điểm chính khi demo), chip chất liệu, chip câu hỏi gợi ý, câu quyền riêng tư.
- **Ảnh** chọn/chụp/kéo-thả nằm chờ trong ô nhập (bước "xem lại"), gửi kèm câu hỏi tuỳ ý. Gửi đi: tin của người dùng chỉ hiện thumbnail ~96px; ảnh ~1024px chỉ tới `/analyze`; trả lời là **card kết quả** do client tạo (data part `data-analysis`; ADR-024 mục 7: client tạo card, không dùng tool calling): chất liệu, độ tin cậy, "Không đúng? Sửa lại" (chọn lại ngay trong card), lưu ý an toàn, tiềm năng tái chế, ý tưởng có lọc độ khó ngay trong tin, KIT, workshop. Câu hỏi gõ kèm ảnh được hỏi ngay sau card, khi đã biết chất liệu.
- **Chip chất liệu / ảnh mẫu** = gửi một tin (không gọi API, dữ liệu cố định).
- **Đồ nguy hại** → card `data-hazard`; **không nhận diện được / lỗi / timeout / offline / vượt giới hạn** → card `data-picker` (chọn chất liệu hoặc ảnh mẫu ngay trong tin; offline hiện như thông tin, không như lỗi).
- **Chat tự do** không cần ảnh: server suy ra chất liệu từ câu hỏi (§2).
- Card ý tưởng mở `/laviagent/y-tuong/[id]?hoi-thoai=<id>`; trang ý tưởng không còn chat riêng: "Hỏi LaviAgent về ý tưởng này" và "Ý tưởng khác" quay về đúng cuộc trò chuyện (`?hoi-thoai=`), vào thẳng thì mở cuộc mới về ý tưởng (`?y-tuong=<id>`).

### 4.2 Dự phòng

**Ảnh mẫu** trả kết quả cố định không gọi API; analyze lỗi/timeout → card chọn chất liệu + ảnh mẫu; **chip gợi ý** luôn có, chat lỗi (kể cả lỗi giữa stream, mất kết nối, câu trả lời rỗng) thì câu trùng chip được trả bằng câu viết sẵn (`fallback-answers.json`, ghi "Câu trả lời soạn sẵn"), câu khác hiện thông báo thân thiện trên ô nhập; `LAVIAGENT_DEMO_MODE=offline` chạy hoàn toàn không mạng.

### 4.3 Lịch sử trò chuyện

- Desktop: sidebar trái (thu gọn được) với "Cuộc trò chuyện mới", nhóm Hôm nay / 7 ngày qua / Cũ hơn, xoá từng cuộc. Mobile/tablet: nút lịch sử ở header khung chat mở drawer.
- Tiêu đề tự đặt theo chất liệu của card đầu tiên hoặc câu hỏi đầu (`conversation-title.ts`). URL `?hoi-thoai=<id>`; mở lại cuộc cũ thì nạp lại tin và chất liệu, chat tiếp với ngữ cảnh cũ.
- Lưu qua `ChatHistoryStore` (async). Bản demo: `LocalChatHistoryStore`, `localStorage` key `lavieco.laviagent.history.v1`, đọc qua Zod (hỏng → coi như trống), tối đa **30 cuộc** và **60 tin/cuộc**, mọi truy cập bọc `try/catch`, đầy bộ nhớ thì bỏ cuộc cũ nhất. Chỉ lưu phần tin biết trước (chữ, card, thumbnail).
- **Ảnh:** không lưu ảnh gốc ở đâu cả; trên máy người dùng chỉ có thumbnail ~96px (JPEG vẽ lại bằng canvas, không EXIF, ≤ 24 KB) hoặc đường dẫn ảnh mẫu. Câu hiển thị: "Ảnh không được lưu trên máy chủ. Lịch sử chỉ lưu trên thiết bị của bạn."
- `TODO(laviagent-server-history)`: `ServerChatHistoryStore` đồng bộ theo tài khoản member (MongoDB, qua service) khi LaviAgent có đăng nhập; cần đồng ý và chính sách lưu giữ.

Trên toàn site: pill "LaviAgent · AI" trên navbar (cạnh nút Hợp tác, viền gradient Emerald → Canary chạy nhẹ), thẻ đầu drawer mobile, FAB "Hỏi LaviAgent" góc phải dưới (không có trên trang chat; ẩn ở trang ý tưởng, thanh toán, vé, đăng nhập/đăng ký), section ngay sau Hero trên trang chủ (có dải "Bốn bước"). Mọi chuyển động tắt khi `prefers-reduced-motion`.

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
4. **Lịch sử theo tài khoản & tác động cá nhân** (`TODO(laviagent-server-history)`, đã có thiết kế Stitch) — lịch sử hiện chỉ trên thiết bị (§4.3); đồng bộ theo tài khoản cần member, đồng ý, DB; không thu thông tin học sinh (BR-08).

## 7. Cấu hình Gemini

1. Vào **Google AI Studio** (`https://aistudio.google.com`), đăng nhập tài khoản Google của đội.
2. Chọn **Get API key** → **Create API key** (chọn hoặc tạo một Google Cloud project riêng cho LAVIECO; dev và prod nên là hai project/khoá khác nhau).
3. Dán vào `apps/web/.env.local`: `GEMINI_API_KEY=...` (không commit, không gửi qua chat). Production: `/opt/lavieco/env/web.env`.
4. `GEMINI_MODEL` mặc định `gemini-3.8-flash`. **Bị giới hạn tần suất (lỗi 429, LaviAgent báo "đang bận") thì đổi `GEMINI_MODEL` sang bản Flash-Lite** rồi khởi động lại `web`.
5. **Tên model Gemini thay đổi theo thời gian.** Model cũ có thể bị ngừng cho người dùng mới (API trả **404**; server ghi log `laviagent model not found` kèm tên model). Xem danh sách model mà key của bạn dùng được:
   ```bash
   curl -s -H "x-goog-api-key: $GEMINI_API_KEY" "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200" | grep '"name"'
   ```
   Chọn một model có `generateContent` trong `supportedGenerationMethods`, bỏ tiền tố `models/`, rồi đặt vào `GEMINI_MODEL`. Lưu ý `.env.local` đã có dòng `GEMINI_MODEL=` thì giá trị đó thắng giá trị mặc định trong code.
6. Không có mạng khi thuyết trình: `LAVIAGENT_DEMO_MODE=offline`.

**Lưu ý dữ liệu:** ở gói miễn phí, Google có thể dùng nội dung gửi lên (ảnh, câu hỏi) để cải thiện sản phẩm của họ. Với người dùng thật (nhất là học sinh), cân nhắc gói trả phí hoặc mô hình riêng trước khi mở rộng; trang đã ghi rõ ảnh không được LAVIECO lưu lại.
