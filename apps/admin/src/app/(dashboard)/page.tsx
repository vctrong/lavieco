import { OverviewPage } from "@/features/dashboard";
import { requireStaff } from "@/features/shell";

export default async function OverviewRoute() {
  return <OverviewPage staff={await requireStaff()} />;
}
