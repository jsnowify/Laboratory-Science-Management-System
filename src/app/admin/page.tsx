import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Overview } from "@/components/dashboard/overview";
import { requirePageRole } from "@/lib/api/server";

export default async function AdminPage() {
  const profile = await requirePageRole("admin");
  return <DashboardShell profile={profile} title="Administration"><Overview role="admin" links={[{ label: "Pending accounts", href: "/admin/users/" }, { label: "Equipment inventory", href: "/admin/equipment/" }, { label: "Analytics", href: "/admin/analytics/" }]} /></DashboardShell>;
}
