import { AdminShell, requireStaff } from "@/features/shell";

/** Every dashboard page requires a staff session (checked again by each service). */
export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const staff = await requireStaff();
  return <AdminShell staff={staff}>{children}</AdminShell>;
}
