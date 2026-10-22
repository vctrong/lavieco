import { ComingSoonSection, comingSoonPageMetadata } from "@/features/coming-soon";

export const metadata = comingSoonPageMetadata("handbook");

export default function CamNangPage() {
  return <ComingSoonSection page="handbook" />;
}
