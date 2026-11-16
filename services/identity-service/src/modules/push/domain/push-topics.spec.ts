import { describe, expect, it } from "vitest";

import { allowedTopics, effectiveTopics, wantsTopic } from "./push-topics";

describe("push topics", () => {
  it("gives each role only the topics its permissions can open", () => {
    expect(allowedTopics(["coordinator"])).toEqual(
      expect.arrayContaining(["order_paid", "registration_free", "event_seats"]),
    );
    expect(allowedTopics(["content_editor"])).not.toContain("order_paid");
    expect(allowedTopics(["super_admin"])).toContain("lead_new");
  });

  it("turns every allowed topic on until the person chooses", () => {
    expect(effectiveTopics(["coordinator"], null)).toEqual(allowedTopics(["coordinator"]));
  });

  it("never grants a chosen topic the permissions do not allow", () => {
    expect(effectiveTopics(["content_editor"], ["order_paid"])).toEqual([]);
    expect(wantsTopic(["content_editor"], ["order_paid"], "order_paid")).toBe(false);
  });

  it("respects an empty choice (all alerts off)", () => {
    expect(effectiveTopics(["super_admin"], [])).toEqual([]);
  });
});
