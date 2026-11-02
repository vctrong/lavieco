import type { Metadata } from "next";

import {
  CAMPAIGNS_TEXT,
  CampaignPage,
  loadCampaign,
  loadCampaignChoices,
} from "@/features/campaigns";

export const metadata: Metadata = { title: CAMPAIGNS_TEXT.vi.meta.edit };

export default async function CampaignRoute({
  params,
  searchParams,
}: PageProps<"/campaigns/[id]">) {
  const { id } = await params;
  const cursor = (await searchParams)["nguoi-nhan"];
  const [{ campaign, recipients }, choices] = await Promise.all([
    loadCampaign(id, { cursor: typeof cursor === "string" ? cursor : undefined }),
    loadCampaignChoices(`/campaigns/${id}`),
  ]);
  return <CampaignPage campaign={campaign} recipients={recipients} choices={choices} />;
}
