import { describe, expect, it } from "vitest";

import { EMAIL_HTML_BUDGET_BYTES } from "@lavieco/service-kit";

import { campaignEmailCases } from "../../../test/support/mail-cases";
import { UnsubscribeTokens, campaignEmail } from "./campaign-email";

const cases = campaignEmailCases();
const of = (name: string) => cases.find((item) => item.name === name)!.input;

describe("campaign emails", () => {
  it.each(cases)("$name stays the same", ({ input }) => {
    const mail = campaignEmail(input);
    expect({ subject: mail.subject, text: mail.text, headers: mail.headers }).toMatchSnapshot();
    expect(Buffer.byteLength(mail.html)).toBeLessThan(EMAIL_HTML_BUDGET_BYTES);
  });

  it("fills the variables and always offers a way out", () => {
    const mail = campaignEmail(of("thank-you"));
    expect(mail.subject).toBe("Cảm ơn bạn đã tham gia Workshop làm chậu cây từ bột vỏ sò");
    expect(mail.text).toContain("Xin chào Nguyễn Thị Khách,");
    expect(mail.text).not.toContain("{{");
    expect(mail.html).toContain('href="http://localhost:3000/huy-nhan/fake-unsubscribe-token"');
    expect(mail.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("gives one person one link per ticket and asks to pass them on", () => {
    const mail = campaignEmail(of("feedback-two-tickets"));
    expect(mail.text).toContain("fake-ticket-1");
    expect(mail.text).toContain("fake-ticket-2");
    expect(mail.text).toContain("chuyển cho người đi cùng");
    const one = campaignEmail(of("feedback-one-ticket"));
    expect(one.text).not.toContain("chuyển cho người đi cùng");
  });

  it("never lets typed text become HTML", () => {
    const input = of("thank-you");
    const mail = campaignEmail({
      ...input,
      name: "<img src=x onerror=alert(1)>",
      campaign: { ...input.campaign, body: "<script>alert(1)</script> {{ten}}" },
    });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).not.toContain("<img src=x");
    expect(mail.html).toContain("&#60;script&#62;");
  });
});

describe("unsubscribe tokens", () => {
  const tokens = new UnsubscribeTokens(Buffer.from("test-secret-test-secret-test-secret"));
  const id = "a".repeat(24);

  it("verifies its own, and carries no email", () => {
    const token = tokens.sign(id);
    expect(tokens.verify(token)).toBe(id);
    expect(token).not.toContain("@");
  });

  it("refuses a change of recipient or a forged signature", () => {
    const [, mac] = tokens.sign(id).split(".");
    expect(tokens.verify(`${"b".repeat(24)}.${mac}`)).toBeNull();
    expect(tokens.verify(`${id}.${"x".repeat(43)}`)).toBeNull();
    expect(tokens.verify("rac")).toBeNull();
  });
});
