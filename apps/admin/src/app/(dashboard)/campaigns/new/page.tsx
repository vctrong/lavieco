import type { Metadata } from "next";

import { CAMPAIGNS_TEXT, NewCampaignPage, loadCampaignChoices } from "@/features/campaigns";

export const metadata: Metadata = { title: CAMPAIGNS_TEXT.vi.meta.create };

export default async function NewCampaignRoute() {
  return <NewCampaignPage choices={await loadCampaignChoices("/campaigns/new")} />;
}
