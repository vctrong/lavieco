# ADR-015: Thanh toán payOS là một module của `program-service`

| | |
|---|---|
| **Trạng thái** | Chấp nhận |
| **Ngày** | 17/10/2026 |
| **Người đề xuất** | V.C. Trọng |
| **Liên quan** | `docs/05` §3, §5.1, ADR-014 |

## Bối cảnh

`docs/05` §3 đề xuất một `payment-service` riêng. Khi webhook báo đã trả tiền, hệ thống phải chuyển đơn `pending → paid`, đổi `held → sold` và phát hành vé **đúng một lần**. Nếu tách service, bước này thành giao dịch xuyên service (cấm theo `docs/02` §15.1).

## Quyết định

1. payOS là module **`payments`** bên trong `program-service`. `payment_events` nằm trong `lavieco_program`.
2. Webhook công khai **đi qua Route Handler của `web`** (`/api/payments/payos/webhook`), chuyển nguyên raw body tới service. **Chữ ký được xác minh ở service** (checksum key chỉ có ở service). Service không mở ra Internet (`docs/02` P4).
3. `returnUrl` chỉ để hiển thị, không bao giờ dùng để xác nhận thanh toán.
4. Kiểm tra SDK `@payos/node` phiên bản hiện tại trước khi viết code (Phase 5), không viết theo trí nhớ.

## Hệ quả

- Xác nhận thanh toán, đổi chỗ và phát hành vé nằm trong một giao dịch của một service.
- Khi có đơn combo B2B (`order-service`, GĐ2) và cần dùng chung cổng thanh toán, tách `payments` ra theo `docs/02` §14.1.
