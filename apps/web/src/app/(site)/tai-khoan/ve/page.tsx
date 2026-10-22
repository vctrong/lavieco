import { ComingSoonSection, comingSoonPageMetadata } from "@/features/coming-soon";

export const metadata = comingSoonPageMetadata("tickets");

export default function VeCuaToiPage() {
  return <ComingSoonSection page="tickets" />;
}
