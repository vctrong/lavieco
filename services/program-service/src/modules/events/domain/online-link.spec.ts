import { describe, expect, it } from "vitest";

import { assertOnlineLinkKept } from "./online-link";

const online = { format: "online" as const, onlineUrl: "https://meet.example/a" };

describe("assertOnlineLinkKept", () => {
  it("lets the link change but not disappear once tickets are sold", () => {
    expect(() =>
      assertOnlineLinkKept(online, { ...online, onlineUrl: "https://meet.example/b" }, 3),
    ).not.toThrow();
    expect(() => assertOnlineLinkKept(online, { ...online, onlineUrl: null }, 3)).toThrow(
      "event.online_url_locked",
    );
    expect(() => assertOnlineLinkKept(online, { format: "offline", onlineUrl: null }, 1)).toThrow(
      "event.online_url_locked",
    );
  });

  it("allows anything before the first sale", () => {
    expect(() => assertOnlineLinkKept(online, { ...online, onlineUrl: null }, 0)).not.toThrow();
  });
});
