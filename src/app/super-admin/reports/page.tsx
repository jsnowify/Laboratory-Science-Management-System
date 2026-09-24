import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ReportBrowser } from "@/components/reports/report-browser";
import { requirePageRole } from "@/lib/api/server";

export default async function SuperAdminReportsPage() {
  const profile = await requirePageRole("super_admin");
  return <DashboardShell profile={profile} title="Operations reports"><ReportBrowser reports={["custody", "overdue", "borrowing-history", "accountability"]} /></DashboardShell>;
}
