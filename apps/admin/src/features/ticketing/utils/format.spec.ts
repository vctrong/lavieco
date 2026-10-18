import { describe, expect, it } from "vitest";

import { normaliseTicketCode } from "./format";

describe("normaliseTicketCode", () => {
  it("accepts a typed code in any case", () => {
    expect(normaliseTicketCode(" lvc-7k3q9m ")).toBe("LVC-7K3Q9M");
  });

  it("refuses look-alike letters and other shapes", () => {
    expect(normaliseTicketCode("LVC-7K3Q9O")).toBeNull();
    expect(normaliseTicketCode("7K3Q9M")).toBeNull();
  });
});
