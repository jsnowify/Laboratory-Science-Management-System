import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AssetsManager } from "@/components/equipment/assets-manager";
import { requirePageRole } from "@/lib/api/server";

export default async function AssetsPage() {
  const profile = await requirePageRole("admin");
  return (
    <DashboardShell profile={profile} title="Physical equipment assets">
      <AssetsManager />
    </DashboardShell>
  );
}
