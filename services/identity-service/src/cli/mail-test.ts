import { emailSchema } from "@lavieco/shared/identity";
import { ConfigError, runMailTest } from "@lavieco/service-kit";

import { loadIdentityEnv } from "../config/env";

/**
 * `npm run mail:test -- <email>` (from the repo root, for both sending services): logs in
 * to SMTP with this service's `.env.local` and sends one test message (docs/06). Prints
 * the server and the reason of a failure, never the login or the password.
 */
async function main() {
  const to = emailSchema.safeParse(process.argv[2]);
  if (!to.success) {
    console.error("Usage: npm run mail:test -- <email nhận thử>");
    process.exitCode = 2;
    return;
  }
  let env;
  try {
    env = loadIdentityEnv();
  } catch (error) {
    const keys = error instanceof ConfigError ? error.invalidKeys.join(", ") : "?";
    console.error(
      `[identity-service] Cấu hình sai, cần sửa trong services/identity-service/.env.local: ${keys}`,
    );
    process.exitCode = 1;
    return;
  }
  const result = await runMailTest("identity-service", env, to.data);
  if (result.ok) {
    console.log(`[identity-service] Đã gửi qua ${result.via}. Kiểm tra hộp thư (cả mục Spam).`);
  } else {
    console.error(`[identity-service] Lỗi ở bước ${result.step}: ${result.reason}`);
    process.exitCode = 1;
  }
}

if (require.main === module) void main();
