import { Writable } from "node:stream";

import { describe, expect, it } from "vitest";

import { createLogger } from "./logger";
import { REDACTED, redact } from "./redaction";

function capture() {
  const lines: string[] = [];
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(String(chunk));
      callback();
    },
  });
  return { lines, destination };
}

describe("redact", () => {
  it("masks personal data and secrets at any depth", () => {
    const out = redact({
      email: "a@b.vn",
      user: { Phone: "0912345678", displayName: "Nguyễn A", id: "u1" },
      headers: { authorization: "Bearer x", "x-request-id": "r1" },
      items: [{ password: "p", count: 2 }],
    });
    expect(out).toEqual({
      email: REDACTED,
      user: { Phone: REDACTED, displayName: REDACTED, id: "u1" },
      headers: { authorization: REDACTED, "x-request-id": "r1" },
      items: [{ password: REDACTED, count: 2 }],
    });
  });

  it("leaves primitives untouched", () => {
    expect(redact("plain")).toBe("plain");
    expect(redact(3)).toBe(3);
  });
});

describe("createLogger", () => {
  it("never writes PII into the log line", () => {
    const { lines, destination } = capture();
    const logger = createLogger({ service: "test", destination });
    logger.info("member registered", { userId: "u1", email: "khach@example.com", code: "123456" });
    const line = lines.join("");
    expect(line).toContain('"userId":"u1"');
    expect(line).toContain('"service":"test"');
    expect(line).not.toContain("khach@example.com");
    expect(line).not.toContain("123456");
  });

  it("redacts child bindings too", () => {
    const { lines, destination } = capture();
    createLogger({ service: "test", destination }).child({ email: "x@y.vn" }).warn("w");
    expect(lines.join("")).not.toContain("x@y.vn");
  });
});
