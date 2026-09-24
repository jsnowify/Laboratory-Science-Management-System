import { DashboardShell } from "@/components/layout/dashboard-shell";
import { CategoriesManager } from "@/components/equipment/categories-manager";
import { requirePageRole } from "@/lib/api/server";

export default async function CategoriesPage() {
  const profile = await requirePageRole("admin");
  return <DashboardShell profile={profile} title="Equipment categories"><CategoriesManager /></DashboardShell>;
}
