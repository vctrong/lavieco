# Âm thanh

## `apps/web/public/sounds/page-flip.wav` (tiếng lật giấy của Cẩm nang)

- **Nguồn:** LAVIECO tự tạo bằng chương trình (nhiễu lọc + đường bao), không thu âm, không lấy của bên thứ ba. Script tạo ở cuối trang; chạy lại cho ra đúng tệp cũ (nhiễu có hạt giống cố định).
- **Giấy phép:** CC0 1.0 (dùng tự do, không cần ghi công).
- **Định dạng:** WAV PCM 16-bit mono, 22,05 kHz, 0,32 giây, khoảng 14 KB (mọi trình duyệt phát được, dưới mức 30 KB).
- **Dùng ở:** màn đọc Cẩm nang (`features/handbook/hooks/use-flip-sound.ts`). **Mặc định tắt**; người đọc bật bằng nút loa, lựa chọn nhớ trên thiết bị. Tệp chỉ được tải khi người đọc bật tiếng.
- Đổi âm thanh thì **đổi tên tệp** (cache trình duyệt), cập nhật hằng `SOUND_SRC` và trang này.

### Script tạo

```js
// node page-flip.mjs apps/web/public/sounds/page-flip.wav
// Mono 16-bit PCM WAV, 22.05 kHz, ~0.32 s. Deterministic (seeded noise).
import { writeFileSync } from "node:fs";
const rate = 22050, seconds = 0.32, n = Math.round(rate * seconds);
let seed = 7; const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
const out = new Int16Array(n);
let lp = 0, hp = 0, prev = 0;
for (let i = 0; i < n; i++) {
  const t = i / n;
  // Swoosh: fast attack, a second rustle bump, smooth decay.
  const env = Math.min(1, t / 0.08) * Math.exp(-4.2 * t) * (1 + 0.6 * Math.exp(-((t - 0.55) ** 2) / 0.004));
  const cutoff = 0.08 + 0.35 * (1 - t); // brighter at the start, duller at the end
  const x = rand();
  lp += cutoff * (x - lp);              // one-pole low-pass
  hp = 0.97 * (hp + lp - prev); prev = lp; // gentle high-pass removes rumble
  out[i] = Math.max(-32767, Math.min(32767, Math.round(hp * env * 26000)));
}
const data = Buffer.from(out.buffer);
const header = Buffer.alloc(44);
header.write("RIFF", 0); header.writeUInt32LE(36 + data.length, 4); header.write("WAVE", 8);
header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
header.write("data", 36); header.writeUInt32LE(data.length, 40);
writeFileSync(process.argv[2], Buffer.concat([header, data]));
```
