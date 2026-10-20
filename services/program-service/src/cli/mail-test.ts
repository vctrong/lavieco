import { z } from "zod";

import { emailSchema } from "@lavieco/shared/identity";
import { ConfigError, MAIL_TEST_PROVIDERS, runMailTest } from "@lavieco/service-kit";

import { loadProgramEnv } from "../config/env";

const SERVICE = "program-service";

/**
 * `npm run mail:test -- <email> [--provider=auto|brevo|gmail]` (from the repo root, for
 * both sending services): logs in with this service's `.env.local` and sends one test
 * message (docs/06, ADR-0023). `auto` follows the service's order, Brevo then Gmail.
 * Prints servers and the reason of a failure, never the login or the password.
 */
async function main() {
  const args = process.argv.slice(2);
  const to = emailSchema.safeParse(args.find((arg) => !arg.startsWith("--")));
  const providerArg = args.find((arg) => arg.startsWith("--provider="))?.split("=")[1];
  const provider = z.enum(MAIL_TEST_PROVIDERS).default("auto").safeParse(providerArg);
  if (!to.success || !provider.success) {
    console.error("Usage: npm run mail:test -- <email nhận thử> [--provider=auto|brevo|gmail]");
    process.exitCode = 2;
    return;
  }
  let env;
  try {
    env = loadProgramEnv();
  } catch (error) {
    const keys = error instanceof ConfigError ? error.invalidKeys.join(", ") : "?";
    console.error(
      `[${SERVICE}] Cấu hình sai, cần sửa trong services/${SERVICE}/.env.local: ${keys}`,
    );
    process.exitCode = 1;
    return;
  }
  const result = await runMailTest(SERVICE, env, to.data, { provider: provider.data });
  for (const attempt of result.attempts) {
    if (attempt.ok) {
      console.log(
        `[${SERVICE}] ${attempt.provider}: đã gửi qua ${attempt.via}. Kiểm tra hộp thư (cả mục Spam).`,
      );
    } else {
      console.error(
        `[${SERVICE}] ${attempt.provider}: lỗi ở bước ${attempt.step}: ${attempt.reason}`,
      );
    }
  }
  if (!result.ok) {
    if (result.reason) console.error(`[${SERVICE}] ${result.reason}`);
    process.exitCode = 1;
  }
}

if (require.main === module) void main();
