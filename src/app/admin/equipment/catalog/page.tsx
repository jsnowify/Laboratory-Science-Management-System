import { DashboardShell } from "@/components/layout/dashboard-shell";
import { CatalogManager } from "@/components/equipment/catalog-manager";
import { requirePageRole } from "@/lib/api/server";

export default async function CatalogPage() {
  const profile = await requirePageRole("admin");
  return <DashboardShell profile={profile} title="Equipment catalog"><CatalogManager /></DashboardShell>;
}
