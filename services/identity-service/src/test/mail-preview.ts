import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { emailPreviewHtml, mailTestEmail, type RenderedEmail } from "@lavieco/service-kit";
import { OTP_PURPOSES } from "@lavieco/shared/identity";

import { passwordChangedEmail } from "../modules/outbox/password-changed.template";
import { accountExistsEmail, otpCodeEmail } from "../modules/otp/infrastructure/otp-mail.templates";

/**
 * `npm run mail:preview` (repo root): writes every identity email as `<name>.html` +
 * `<name>.txt` into the folder given. Development only: never built, never sends.
 */
function main() {
  const out = process.argv[2];
  if (!out) throw new Error("Usage: mail-preview <output folder>");
  mkdirSync(out, { recursive: true });
  const web = "http://localhost:3000";
  const emails: { name: string; mail: RenderedEmail }[] = [
    ...OTP_PURPOSES.map((purpose) => ({
      name: `otp-${purpose}`,
      mail: otpCodeEmail("482913", purpose, 10, web),
    })),
    { name: "account-exists", mail: accountExistsEmail(web) },
    { name: "password-changed", mail: passwordChangedEmail(web) },
    { name: "mail-test", mail: mailTestEmail("identity-service", new Date()) },
  ];
  for (const { name, mail } of emails) {
    writeFileSync(join(out, `${name}.html`), emailPreviewHtml(mail));
    writeFileSync(join(out, `${name}.txt`), `Subject: ${mail.subject}\n\n${mail.text}`);
  }
  process.stdout.write(`[identity-service] ${emails.length} emails → ${out}\n`);
}

main();
