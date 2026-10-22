import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { toBuffer } from "qrcode";

import { emailPreviewHtml, mailTestEmail } from "@lavieco/service-kit";

import { eventCancelledEmail } from "../modules/orders/infrastructure/event-cancelled-email.template";
import { QR_IMAGE_OPTIONS } from "../modules/orders/infrastructure/smtp-ticket-mailer";
import { qrAttachment, ticketEmail } from "../modules/orders/infrastructure/ticket-email.template";
import { eventCancelledEmailCases, ticketEmailCases } from "./support/mail-cases";

/**
 * `npm run mail:preview` (repo root): writes every ticket email case, rendered from
 * made-up orders, as `<name>.html` + `<name>.txt` into the folder given. Development
 * only: never built, never sends anything.
 */
async function main() {
  const out = process.argv[2];
  if (!out) throw new Error("Usage: mail-preview <output folder>");
  mkdirSync(out, { recursive: true });
  const emails = [{ name: "mail-test", mail: mailTestEmail("program-service", new Date()) }];
  for (const { name, input } of ticketEmailCases()) {
    const mail = ticketEmail(input);
    const qr = await Promise.all(
      input.tickets.map(async (ticket) =>
        qrAttachment(ticket, await toBuffer(ticket.qrToken, QR_IMAGE_OPTIONS)),
      ),
    );
    emails.push({
      name: `ticket-${name}`,
      mail: { ...mail, attachments: [...mail.attachments, ...qr] },
    });
  }
  for (const { name, input } of eventCancelledEmailCases()) {
    emails.push({ name: `event-cancelled-${name}`, mail: eventCancelledEmail(input) });
  }
  for (const { name, mail } of emails) {
    writeFileSync(join(out, `${name}.html`), emailPreviewHtml(mail));
    writeFileSync(join(out, `${name}.txt`), `Subject: ${mail.subject}\n\n${mail.text}`);
  }
  process.stdout.write(`[program-service] ${emails.length} emails → ${out}\n`);
}

void main();
