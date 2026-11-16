import { InstallPrompt } from "@/features/pwa";
import { AdminShell, requireStaff } from "@/features/shell";
import { DraftOwnerProvider } from "@/shared/drafts";

/** Every dashboard page requires a staff session (checked again by each service). */
export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const staff = await requireStaff();
  return (
    <AdminShell staff={staff}>
      <DraftOwnerProvider owner={staff.id}>{children}</DraftOwnerProvider>
      <InstallPrompt />
    </AdminShell>
  );
}
