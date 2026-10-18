/**
 * Rules every rendered email must pass, shared by the template tests of each service:
 * table layout (no flex/grid), no scripts, no remote images, alt on every image, nothing
 * wider than 600 px. Returns the broken rules, empty when the email is fine.
 */
export function emailHtmlIssues(html: string): string[] {
  const issues: string[] = [];
  if (/display\s*:\s*(flex|grid|inline-flex)/i.test(html)) issues.push("flex/grid layout");
  if (/<script\b/i.test(html)) issues.push("script tag");
  if (/<link\b[^>]*fonts\.googleapis/i.test(html) || /@import/i.test(html)) {
    issues.push("remote font");
  }
  for (const img of html.match(/<img\b[^>]*>/gi) ?? []) {
    if (!/\balt="[^"]+"/i.test(img)) issues.push(`image without alt: ${img.slice(0, 60)}`);
    if (!/\bsrc="cid:/i.test(img)) issues.push(`image not embedded (cid): ${img.slice(0, 60)}`);
  }
  for (const width of html.matchAll(/\bwidth="(\d+)"/gi)) {
    if (Number(width[1]) > 600) issues.push(`element wider than 600px (${width[1]})`);
  }
  return issues;
}

/** Gmail clips messages whose HTML passes ~102 KB; templates stay well under. */
export const EMAIL_HTML_BUDGET_BYTES = 90 * 1024;
