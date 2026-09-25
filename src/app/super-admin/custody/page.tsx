import { DashboardShell } from "@/components/layout/dashboard-shell";
import { CustodyTable } from "@/components/borrowing/custody-table";
import { requirePageRole } from "@/lib/api/server";

export default async function CustodyPage() {
  const profile = await requirePageRole("super_admin");
  return (
    <DashboardShell profile={profile} title="Current custody">
      <CustodyTable canReturn />
    </DashboardShell>
  );
}
