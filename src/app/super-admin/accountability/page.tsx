import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AccountabilityTable } from "@/components/borrowing/accountability-table";
import { requirePageRole } from "@/lib/api/server";

export default async function AccountabilityPage() {
  const profile = await requirePageRole("super_admin");
  return <DashboardShell profile={profile} title="Institutional accountability"><AccountabilityTable institutional /></DashboardShell>;
}
