import { describe, expect, it } from "vitest";

import { EMAIL_HTML_BUDGET_BYTES, emailHtmlIssues } from "@lavieco/service-kit";
import { ORDER_LIMITS } from "@lavieco/shared/events";

import {
  fakeEvent,
  fakeOrder,
  fakeTickets,
  ticketEmailCases,
} from "../../../test/support/mail-cases";
import { formatSchedule, qrCid, ticketEmail } from "./ticket-email.template";

const cases = ticketEmailCases();

describe("ticketEmail", () => {
  it.each(cases)("$name renders a safe email (snapshot)", ({ input }) => {
    const mail = ticketEmail(input);
    expect(emailHtmlIssues(mail.html)).toEqual([]);
    expect(mail.html).toMatchSnapshot("html");
    expect(mail.text).toMatchSnapshot("text");
  });

  it.each(cases)("$name has every ticket in both parts, each QR by cid", ({ input }) => {
    const mail = ticketEmail(input);
    for (const ticket of input.tickets) {
      expect(mail.html).toContain(`src="cid:${qrCid(ticket)}"`);
      expect(mail.html).toContain(`alt="Mã QR vé ${ticket.code}"`);
      expect(mail.text).toContain(ticket.code);
    }
    expect(mail.html).toContain(input.ticketPageUrl);
    expect(mail.text).toContain(input.ticketPageUrl);
    expect(mail.text).toContain(String(input.order.orderCode));
  });

  it("says confirmed for a free order and paid otherwise", () => {
    const [paid, , free] = cases;
    expect(ticketEmail(paid!.input).html).toContain("Đã thanh toán");
    expect(ticketEmail(free!.input).html).toContain("Đã xác nhận");
    expect(ticketEmail(free!.input).html).not.toContain("Đã thanh toán");
    expect(ticketEmail(free!.input).text).toContain("Miễn phí");
  });

  it("shows the venue offline and the join link online", () => {
    const offline = ticketEmail(cases[0]!.input);
    expect(offline.text).toContain("Địa điểm: Xưởng thử nghiệm, Ninh Kiều, Cần Thơ");
    const online = ticketEmail(cases[2]!.input);
    expect(online.text).toContain("Tham gia: https://meet.example.test/lavieco-talkshow");
    expect(online.html).toContain('href="https://meet.example.test/lavieco-talkshow"');
  });

  it("adds the safety notes only when the event has some, keeping line breaks", () => {
    expect(ticketEmail(cases[0]!.input).html).not.toContain("Lưu ý an toàn");
    const withNotes = ticketEmail(cases[1]!.input);
    expect(withNotes.html).toContain("Lưu ý an toàn");
    expect(withNotes.html).toContain("dính bẩn.<br>Khu vực");
  });

  it("invites guests to create an account, not members", () => {
    expect(ticketEmail(cases[0]!.input).html).toContain("/dang-ky");
    expect(ticketEmail(cases[1]!.input).html).not.toContain("/dang-ky");
  });

  it("says when the tickets are sent again", () => {
    const mail = ticketEmail(cases[5]!.input);
    expect(mail.subject).toBe("Gửi lại vé: Workshop làm chậu cây từ bột vỏ sò");
    expect(mail.text).toContain("Vé và mã QR không thay đổi");
  });

  it("stays under Gmail's clipping size with the most tickets one order can hold", () => {
    const tickets = fakeTickets(
      Array.from({ length: ORDER_LIMITS.ticketsPerOrderMax }, () => "Vé tiêu chuẩn có tên khá dài"),
    );
    const mail = ticketEmail({
      ...cases[6]!.input,
      tickets,
      event: fakeEvent({ safetyNotes: "x".repeat(2000), title: "t".repeat(200) }),
    });
    expect(tickets).toHaveLength(20);
    expect(Buffer.byteLength(mail.html, "utf8")).toBeLessThan(EMAIL_HTML_BUDGET_BYTES);
  });

  it("never puts the booker's email or phone in image names, alt text or content ids", () => {
    const { input } = cases[1]!;
    const mail = ticketEmail(input);
    const imageBits = [
      ...(mail.html.match(/<img\b[^>]*>/g) ?? []),
      ...mail.attachments.map((file) => `${file.filename} ${file.cid}`),
    ].join("\n");
    for (const value of [
      input.order.buyer.email,
      input.order.buyer.phone,
      input.order.buyer.fullName,
    ]) {
      expect(imageBits).not.toContain(value);
    }
    // The email address itself is not printed anywhere in the message.
    expect(mail.html).not.toContain(input.order.buyer.email);
    expect(mail.text).not.toContain(input.order.buyer.email);
  });

  it("escapes what staff typed", () => {
    const mail = ticketEmail({
      ...cases[0]!.input,
      event: fakeEvent({ title: '<img src=x onerror="alert(1)">', safetyNotes: "<b>x</b>" }),
      order: fakeOrder({ buyer: { ...fakeOrder().buyer, fullName: "<script>" } }),
    });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).not.toContain("<img src=x");
    expect(mail.html).not.toContain("<b>x</b>");
  });
});

describe("formatSchedule", () => {
  it("prints one day with its hours, several days with both ends", () => {
    expect(formatSchedule(new Date("2026-11-08T07:00:00Z"), new Date("2026-11-08T10:00:00Z"))).toBe(
      "Chủ Nhật, 08/11/2026 · 14:00–17:00",
    );
    expect(formatSchedule(new Date("2026-11-08T07:00:00Z"), new Date("2026-11-09T10:00:00Z"))).toBe(
      "14:00 08/11/2026 – 17:00 09/11/2026",
    );
  });
});
