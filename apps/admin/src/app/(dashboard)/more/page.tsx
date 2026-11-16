import type { Metadata } from "next";

import { MorePage, SHELL_TEXT, requireStaff } from "@/features/shell";

export const metadata: Metadata = { title: SHELL_TEXT.vi.more.title };

export default async function MoreRoute() {
  return <MorePage staff={await requireStaff("/more")} />;
}
