import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AuditBrowser } from "@/components/dashboard/audit-browser";
import { requirePageRole } from "@/lib/api/server";

export default async function AdminAuditPage() {
  const profile = await requirePageRole("admin");
  return <DashboardShell profile={profile} title="Student and faculty activity"><AuditBrowser audience="student_faculty" /></DashboardShell>;
}
