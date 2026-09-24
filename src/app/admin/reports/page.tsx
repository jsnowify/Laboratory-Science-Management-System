import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ReportBrowser } from "@/components/reports/report-browser";
import { requirePageRole } from "@/lib/api/server";

export default async function AdminReportsPage() {
  const profile = await requirePageRole("admin");
  return <DashboardShell profile={profile} title="Reports"><ReportBrowser reports={["inventory", "borrowing-history", "equipment-usage", "utilization", "borrowing-frequency", "accountability"]} /></DashboardShell>;
}
