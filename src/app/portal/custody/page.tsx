import { DashboardShell } from "@/components/layout/dashboard-shell";
import { CustodyTable } from "@/components/borrowing/custody-table";
import { requirePageRole } from "@/lib/api/server";

export default async function PortalCustodyPage() {
  const profile = await requirePageRole("student_faculty");
  return (
    <DashboardShell profile={profile} title="Equipment in your custody">
      <CustodyTable canReturn={false} />
    </DashboardShell>
  );
}
