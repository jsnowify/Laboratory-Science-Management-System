import { DashboardShell } from "@/components/layout/dashboard-shell";
import { OrganizationManager } from "@/components/organization/organization-manager";
import { requirePageRole } from "@/lib/api/server";

export default async function DepartmentsPage() {
  const profile = await requirePageRole("super_admin");
  return (
    <DashboardShell profile={profile} title="Departments">
      <OrganizationManager resource="departments" />
    </DashboardShell>
  );
}
