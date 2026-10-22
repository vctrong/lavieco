import { describe, expect, it } from "vitest";

import { eventCancelledEmailCases, fakeEvent } from "../../../test/support/mail-cases";
import { eventCancelledEmail } from "./event-cancelled-email.template";

describe("eventCancelledEmail", () => {
  const [paid, free] = eventCancelledEmailCases();

  it("gives the public reason and announces a manual refund for a paid order", () => {
    const mail = eventCancelledEmail(paid!.input);
    expect(mail.subject).toContain("Chương trình đã huỷ");
    expect(mail.text).toContain("Người hướng dẫn bị ốm đột xuất");
    expect(mail.text).toContain("sẽ liên hệ");
    // BR-15: never claims the money was already sent back.
    expect(mail.text).not.toMatch(/đã hoàn/i);
  });

  it("tells a free order there is nothing to refund", () => {
    const mail = eventCancelledEmail(free!.input);
    expect(mail.text).toContain("không có khoản nào cần hoàn");
  });

  it("never carries the online link", () => {
    const online = fakeEvent({
      format: "online",
      onlineUrl: "https://meet.example/secret-room",
      status: "cancelled",
      cancellation: { reason: "Lý do thử nghiệm đủ dài", at: new Date(), by: "x" },
    });
    const mail = eventCancelledEmail({ ...paid!.input, event: online });
    expect(mail.html).not.toContain("secret-room");
    expect(mail.text).not.toContain("secret-room");
  });
});
