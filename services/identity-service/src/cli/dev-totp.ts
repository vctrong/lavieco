import { parseArgs } from "node:util";

import { TOTP, base32Decode, hotp, otpauthUri, timeStep } from "../modules/security";
import { DEV_STAFF } from "./dev-accounts";

/**
 * `npm run dev:totp [-- --email <seeded staff email>] [-- --uri]`: prints the current
 * 2FA code of the seeded staff accounts (docs/dev-local.md). Reads no database and only
 * knows the public dev secrets of `dev-accounts.ts`, so it is useless anywhere else.
 */
function main() {
  const { values } = parseArgs({
    options: { email: { type: "string" }, uri: { type: "boolean", default: false } },
  });
  const accounts = values.email
    ? DEV_STAFF.filter((staff) => staff.email === values.email?.trim().toLowerCase())
    : DEV_STAFF;
  if (accounts.length === 0) {
    console.error(`Not a seeded staff account. Known: ${DEV_STAFF.map((s) => s.email).join(", ")}`);
    process.exit(2);
  }
  const now = new Date();
  const secondsLeft = TOTP.periodSeconds - (Math.floor(now.getTime() / 1000) % TOTP.periodSeconds);
  for (const staff of accounts) {
    const code = hotp(base32Decode(staff.totpSecret), timeStep(now));
    console.log(`${code}  ${staff.email}  (valid ${secondsLeft}s more)`);
    if (values.uri) console.log(`  ${otpauthUri(staff.totpSecret, staff.email)}`);
  }
}

main();
