import type { EmailAttachment } from "./email-layout";

/**
 * The email as a browser can show it (`npm run mail:preview`): every `cid:` image
 * swapped for a data URI of its attachment. Never used for sending.
 */
export function emailPreviewHtml(email: { html: string; attachments?: EmailAttachment[] }) {
  let html = email.html;
  for (const file of email.attachments ?? []) {
    if (!file.cid) continue;
    html = html
      .split(`cid:${file.cid}`)
      .join(`data:${file.contentType};base64,${file.content.toString("base64")}`);
  }
  return html;
}
