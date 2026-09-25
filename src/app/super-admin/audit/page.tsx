import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AuditBrowser } from "@/components/dashboard/audit-browser";
import { requirePageRole } from "@/lib/api/server";

export default async function AuditPage() {
  const profile = await requirePageRole("super_admin");
  return (
    <DashboardShell profile={profile} title="System audit log">
      <AuditBrowser />
    </DashboardShell>
  );
}
