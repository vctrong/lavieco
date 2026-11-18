import type { Metadata } from "next";

import {
  HANDBOOK_TEXT,
  HandbookManager,
  loadHandbook,
  loadHandbookImports,
} from "@/features/handbook";
import { requireStaff } from "@/features/shell";

export const metadata: Metadata = { title: HANDBOOK_TEXT.vi.meta.title };

export default async function HandbookRoute() {
  const staff = await requireStaff("/handbook");
  const [overview, imports] = await Promise.all([loadHandbook(), loadHandbookImports()]);
  const activeJob =
    imports.items.find((job) => job.status === "queued" || job.status === "running") ?? null;
  return (
    <HandbookManager
      initial={overview}
      activeJob={activeJob}
      abilities={{
        write: staff.permissions.includes("handbook:write"),
        publish: staff.permissions.includes("handbook:publish"),
      }}
    />
  );
}
