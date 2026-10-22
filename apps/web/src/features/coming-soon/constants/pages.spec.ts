import { describe, expect, it } from "vitest";

import { COMING_SOON_PAGES, SUGGESTION_HREFS } from "./pages";

describe("coming-soon pages", () => {
  // Until "Vé của tôi" exists, the way to a ticket is the email lookup.
  it("sends /tai-khoan/ve to the ticket lookup", () => {
    expect(SUGGESTION_HREFS[COMING_SOON_PAGES.tickets.suggestion]).toBe("/tra-cuu-ve");
  });
});
