import type { Metadata } from "next";

import { HANDBOOK_TEXT, HandbookHistoryPage, loadHandbook } from "@/features/handbook";
import { requireStaff } from "@/features/shell";

export const metadata: Metadata = { title: HANDBOOK_TEXT.vi.meta.history };

export default async function HandbookHistoryRoute() {
  const staff = await requireStaff("/handbook/history");
  const overview = await loadHandbook("/handbook/history");
  return (
    <HandbookHistoryPage
      overview={overview}
      abilities={{
        write: staff.permissions.includes("handbook:write"),
        publish: staff.permissions.includes("handbook:publish"),
      }}
    />
  );
}
