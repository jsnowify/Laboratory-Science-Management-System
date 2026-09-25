import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { requirePageRole } from "@/lib/api/server";

export default async function AnalyticsPage() {
  const profile = await requirePageRole("admin");
  return (
    <DashboardShell profile={profile} title="Descriptive analytics">
      <AnalyticsDashboard />
    </DashboardShell>
  );
}
