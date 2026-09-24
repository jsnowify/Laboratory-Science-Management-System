import { DashboardShell } from "@/components/layout/dashboard-shell";
import { OrganizationManager } from "@/components/organization/organization-manager";
import { requirePageRole } from "@/lib/api/server";

export default async function CollegesPage() {
  const profile = await requirePageRole("super_admin");
  return <DashboardShell profile={profile} title="Colleges"><OrganizationManager resource="colleges" /></DashboardShell>;
}
