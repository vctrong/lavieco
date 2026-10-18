import { describe, expect, it } from "vitest";

import { mailTestEmail } from "../mail-test";
import { emailHtmlIssues } from "./email-checks";
import { LOGO_CID, renderEmail } from "./email-layout";

describe("renderEmail", () => {
  const email = renderEmail({
    subject: "Tiêu đề <thử>",
    preheader: "Dòng xem trước",
    eyebrow: "Nhãn",
    heading: "Chào bạn & cảm ơn",
    bodyHtml: "<p>Nội dung</p>",
    textLines: ["Nội dung"],
    reason: "Lý do nhận email.",
    siteUrl: "http://localhost:3000",
  });

  it("wraps the body in the shared header and footer", () => {
    expect(email.html).toContain(`src="cid:${LOGO_CID}"`);
    expect(email.html).toContain("Chào bạn &#38; cảm ơn");
    expect(email.html).toContain("Dòng xem trước");
    expect(email.html).toContain("lavieco@gmail.com");
    expect(email.html).toContain("localhost:3000");
    expect(email.html).toContain("Lý do nhận email.");
    expect(emailHtmlIssues(email.html)).toEqual([]);
  });

  it("always attaches the logo inline", () => {
    expect(email.attachments[0]).toMatchObject({ cid: LOGO_CID, contentType: "image/png" });
    expect(email.attachments[0]!.content.subarray(1, 4).toString()).toBe("PNG");
  });

  it("has a plain-text twin with the same footer", () => {
    expect(email.text).toContain("Chào bạn & cảm ơn");
    expect(email.text).toContain("Nội dung");
    expect(email.text).toContain("Lý do nhận email.");
    expect(email.text).not.toMatch(/<[a-z]/i);
  });
});

describe("emailHtmlIssues", () => {
  it("flags flex layouts, images without alt or not embedded, and over-wide tables", () => {
    expect(
      emailHtmlIssues(
        '<div style="display:flex"></div><img src="https://x/y.png"><table width="700">',
      ),
    ).toHaveLength(4);
  });
});

describe("mailTestEmail", () => {
  it("renders in the shared layout", () => {
    const email = mailTestEmail("program-service", new Date("2026-10-18T03:00:00Z"));
    expect(email.subject).toBe("LAVIECO: kiểm tra gửi email (program-service)");
    expect(emailHtmlIssues(email.html)).toEqual([]);
    expect(email.html).toMatchSnapshot();
    expect(email.text).toMatchSnapshot();
  });
});
