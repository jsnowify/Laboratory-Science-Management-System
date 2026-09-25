import { DashboardShell } from "@/components/layout/dashboard-shell";
import { OverdueTable } from "@/components/borrowing/overdue-table";
import { requirePageRole } from "@/lib/api/server";

export default async function OverduePage() {
  const profile = await requirePageRole("super_admin");
  return (
    <DashboardShell profile={profile} title="Overdue equipment">
      <OverdueTable />
    </DashboardShell>
  );
}
