import { DashboardShell } from "@/components/layout/dashboard-shell";
import { RequisitionList } from "@/components/iso/requisition-list";
import { requirePageRole } from "@/lib/api/server";

export default async function IsoPage() {
  const profile = await requirePageRole("super_admin");
  return (
    <DashboardShell profile={profile} title="ISO requisitions">
      <RequisitionList />
    </DashboardShell>
  );
}
