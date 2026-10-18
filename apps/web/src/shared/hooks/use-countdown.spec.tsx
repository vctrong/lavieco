import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { useCountdown } from "./use-countdown";

function Clock({ until }: { until: string | null }) {
  const left = useCountdown(until);
  return <span>{left === null ? "pending" : left}</span>;
}

describe("useCountdown on the server", () => {
  // The payment page hold timer once rendered 14:51 on the server and 14:50 in the
  // browser: a hydration mismatch. The server must not guess "now".
  it("renders no clock value for a deadline, so hydration cannot mismatch", () => {
    const until = new Date(Date.now() + 15 * 60_000).toISOString();
    expect(renderToString(<Clock until={until} />)).toContain("pending");
  });

  it("gives 0 without a deadline", () => {
    expect(renderToString(<Clock until={null} />)).toContain(">0<");
  });
});
