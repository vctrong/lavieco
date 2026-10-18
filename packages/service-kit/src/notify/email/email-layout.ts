import type { EmailMessage } from "../../ports";
import { EMAIL_LOGO } from "./email-logo";
import { EMAIL_BRAND, EMAIL_COLORS as C, EMAIL_FONTS as F } from "./email-tokens";

export type EmailAttachment = NonNullable<EmailMessage["attachments"]>[number];

/** What a template hands to `renderEmail`: the HTML body and its plain-text twin. */
export type EmailContent = {
  subject: string;
  /** Inbox preview line, hidden in the body. */
  preheader: string;
  /** Small label above the heading (status, purpose). */
  eyebrow?: string;
  heading: string;
  /** Body HTML built from the parts below (already escaped). */
  bodyHtml: string;
  /** Body as plain text lines, same information as the HTML. */
  textLines: string[];
  /** Why this address receives the email, shown in the footer. */
  reason: string;
  /** Inline images referenced from `bodyHtml` as `cid:`. */
  attachments?: EmailAttachment[];
  /** Web app origin for the footer link (defaults to the production domain). */
  siteUrl?: string;
};

export type RenderedEmail = Required<Pick<EmailMessage, "subject" | "text" | "html">> & {
  attachments: EmailAttachment[];
};

export const LOGO_CID = "logo@lavieco";

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const BODY_TEXT = `font-family:${F.body};font-size:15px;line-height:24px;color:${C.charcoal}`;

/** A paragraph of body copy; `html` must already be escaped. */
export function emailParagraph(html: string, options: { muted?: boolean; small?: boolean } = {}) {
  const size = options.small ? "font-size:13px;line-height:20px;" : "";
  const color = options.muted ? `color:${C.muted};` : "";
  return `<p style="margin:0 0 16px;${BODY_TEXT};${size}${color}">${html}</p>`;
}

/** An inline link in body copy. */
export function emailLink(label: string, href: string) {
  return `<a href="${escapeHtml(href)}" style="color:${C.deepBlue};font-weight:bold;text-decoration:underline">${escapeHtml(label)}</a>`;
}

/** Primary call to action: a table cell, so it keeps its shape where `<a>` padding is ignored. */
export function emailButton(label: string, href: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:8px auto 24px"><tr><td align="center" bgcolor="${C.emerald}" style="border-radius:999px;background:${C.emerald}"><a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 32px;font-family:${F.body};font-size:15px;line-height:20px;font-weight:bold;color:${C.deepBlue};text-decoration:none;border-radius:999px">${escapeHtml(label)}</a></td></tr></table>`;
}

/** Secondary call to action: outlined. */
export function emailSecondaryButton(label: string, href: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 0"><tr><td style="border:1px solid ${C.deepBlue};border-radius:999px"><a href="${escapeHtml(href)}" style="display:inline-block;padding:10px 22px;font-family:${F.body};font-size:14px;line-height:18px;font-weight:bold;color:${C.deepBlue};text-decoration:none">${escapeHtml(label)}</a></td></tr></table>`;
}

/** Label/value rows (values already escaped). */
export function emailDetails(rows: readonly (readonly [label: string, valueHtml: string])[]) {
  const cells = rows
    .map(
      ([label, value]) =>
        `<tr><td valign="top" width="84" style="padding:6px 12px 6px 0;font-family:${F.body};font-size:12px;line-height:20px;font-weight:bold;color:${C.deepBlue};text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap">${escapeHtml(label)}</td><td valign="top" style="padding:6px 0;${BODY_TEXT};word-break:break-word;overflow-wrap:anywhere">${value}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${cells}</table>`;
}

/** A framed block: `mint` for information, `canary` for what needs attention. */
export function emailPanel(innerHtml: string, tone: "mint" | "canary" | "plain" = "mint") {
  const look = {
    mint: `background:${C.mint};border:1px solid ${C.mint}`,
    canary: `background:${C.canarySoft};border:1px solid ${C.canary}`,
    plain: `background:${C.white};border:1px solid ${C.hairline}`,
  }[tone];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;border-collapse:separate;border-radius:16px;${look}"><tr><td style="padding:20px 24px">${innerHtml}</td></tr></table>`;
}

/** Heading inside a panel. */
export function emailSubheading(text: string) {
  return `<p style="margin:0 0 8px;font-family:${F.display};font-size:19px;line-height:26px;color:${C.deepBlue}">${escapeHtml(text)}</p>`;
}

/** A one-time code, as real text so it can be selected and copied. */
export function emailCode(code: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:8px auto 20px"><tr><td align="center" style="padding:16px 28px;background:${C.mint};border:1px dashed ${C.emerald};border-radius:14px;font-family:${F.mono};font-size:34px;line-height:40px;font-weight:bold;letter-spacing:10px;color:${C.deepBlue}">${escapeHtml(code)}</td></tr></table>`;
}

/** Keeps line breaks of plain text typed by staff (e.g. safety notes). */
export const multiline = (value: string) => escapeHtml(value).replace(/\r?\n/g, "<br>");

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

/**
 * The shared shell of every LAVIECO email: logo header, body, contact footer with the
 * reason for sending. Tables and inline CSS only, 600 px wide, no web fonts loaded,
 * light colour scheme declared; the QR and logo always sit on white so a client that
 * darkens the email keeps them readable and scannable.
 */
export function renderEmail(content: EmailContent): RenderedEmail {
  const siteUrl = content.siteUrl ?? EMAIL_BRAND.siteUrl;
  const site = hostOf(siteUrl);
  const link = `color:${C.white};text-decoration:underline`;
  const eyebrow = content.eyebrow
    ? `<p style="margin:0 0 12px"><span style="display:inline-block;padding:4px 12px;border:1px solid ${C.emerald};border-radius:999px;background:${C.mint};font-family:${F.body};font-size:12px;line-height:18px;font-weight:bold;letter-spacing:1px;color:${C.deepBlue}">${escapeHtml(content.eyebrow)}</span></p>`
    : "";
  const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(content.subject)}</title>
<style>@media (max-width:620px){.lv-pad{padding-left:20px!important;padding-right:20px!important}.lv-h1{font-size:24px!important;line-height:32px!important}}</style>
</head>
<body style="margin:0;padding:0;background:${C.softWhite}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.softWhite};font-size:1px;line-height:1px">${escapeHtml(content.preheader)}${"&#847;&zwnj;&nbsp;".repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.softWhite}" style="background:${C.softWhite}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${C.white};border:1px solid ${C.hairline};border-radius:16px;border-collapse:separate;overflow:hidden">
<tr><td align="center" bgcolor="${C.white}" style="padding:28px 32px 18px;background:${C.white}"><a href="${escapeHtml(siteUrl)}" style="text-decoration:none"><img src="cid:${LOGO_CID}" width="${EMAIL_LOGO.width}" height="${EMAIL_LOGO.height}" alt="${EMAIL_BRAND.name}" style="display:block;border:0;width:${EMAIL_LOGO.width}px;height:${EMAIL_LOGO.height}px;font-family:${F.display};font-size:24px;color:${C.deepBlue}"></a><p style="margin:10px 0 0;font-family:${F.body};font-size:12px;line-height:18px;color:${C.muted}">${EMAIL_BRAND.tagline}</p></td></tr>
<tr><td height="3" bgcolor="${C.canary}" style="height:3px;background:${C.canary};font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td class="lv-pad" style="padding:32px 40px 16px">
${eyebrow}<h1 class="lv-h1" style="margin:0 0 16px;font-family:${F.display};font-size:28px;line-height:36px;font-weight:normal;color:${C.deepBlue}">${escapeHtml(content.heading)}</h1>
${content.bodyHtml}
</td></tr>
<tr><td class="lv-pad" bgcolor="${C.deepBlue}" style="padding:24px 40px;background:${C.deepBlue};font-family:${F.body};font-size:13px;line-height:21px;color:${C.white}">
<p style="margin:0 0 8px;font-weight:bold">${EMAIL_BRAND.name} · ${EMAIL_BRAND.tagline}</p>
<p style="margin:0 0 12px"><a href="${escapeHtml(siteUrl)}" style="${link}">${escapeHtml(site)}</a> · <a href="mailto:${EMAIL_BRAND.email}" style="${link}">${EMAIL_BRAND.email}</a> · Hotline/Zalo ${EMAIL_BRAND.phone}</p>
<p style="margin:0;font-size:12px;line-height:19px;color:${C.mint}">${escapeHtml(content.reason)}</p>
</td></tr>
</table>
</td></tr></table>
</body>
</html>`;

  const text = [
    content.heading,
    "",
    ...content.textLines,
    "",
    "--",
    `${EMAIL_BRAND.name} · ${EMAIL_BRAND.tagline}`,
    `${site} · ${EMAIL_BRAND.email} · Hotline/Zalo ${EMAIL_BRAND.phone}`,
    content.reason,
  ].join("\n");

  return {
    subject: content.subject,
    html,
    text,
    attachments: [
      {
        filename: "lavieco-logo.png",
        content: Buffer.from(EMAIL_LOGO.base64, "base64"),
        contentType: "image/png",
        cid: LOGO_CID,
      },
      ...(content.attachments ?? []),
    ],
  };
}
