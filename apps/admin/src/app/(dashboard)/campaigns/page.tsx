import type { Metadata } from "next";

import { CAMPAIGNS_TEXT, CampaignsListPage, loadCampaigns } from "@/features/campaigns";

export const metadata: Metadata = { title: CAMPAIGNS_TEXT.vi.meta.list };

export default async function CampaignsRoute({ searchParams }: PageProps<"/campaigns">) {
  const { cursor } = await searchParams;
  const page = await loadCampaigns({
    cursor: typeof cursor === "string" ? cursor.slice(0, 512) : undefined,
  });
  return <CampaignsListPage page={page} />;
}
