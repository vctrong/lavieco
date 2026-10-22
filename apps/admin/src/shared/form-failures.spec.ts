import { describe, expect, it } from "vitest";

import { commonFailureMessage } from "./form-failures";

describe("commonFailureMessage", () => {
  it("adds the short reference to a real outage only", () => {
    expect(commonFailureMessage("unavailable", { ref: "9B2F6C1E" })).toBe(
      "Hệ thống đang bận. Vui lòng thử lại sau ít phút. Mã tham chiếu: 9B2F6C1E",
    );
    expect(commonFailureMessage("rate_limited", { retryAfterSeconds: 30 })).toBe(
      "Bạn thao tác quá nhanh, thử lại sau 30 giây.",
    );
    expect(commonFailureMessage("stale_version")).toBe(
      "Trang đã có bản cập nhật, vui lòng tải lại.",
    );
  });
});
