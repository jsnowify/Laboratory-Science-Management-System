import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PortalCatalog } from "@/components/equipment/portal-catalog";
import { requirePageRole } from "@/lib/api/server";

export default async function PortalEquipmentPage() {
  const profile = await requirePageRole("student_faculty");
  return <DashboardShell profile={profile} title="Browse equipment"><PortalCatalog /></DashboardShell>;
}
