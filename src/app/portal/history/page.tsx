import { DashboardShell } from "@/components/layout/dashboard-shell";
import { RequestList } from "@/components/borrowing/request-list";
import { requirePageRole } from "@/lib/api/server";

export default async function HistoryPage() {
  const profile = await requirePageRole("student_faculty");
  return <DashboardShell profile={profile} title="Borrowing history"><RequestList area="portal" /></DashboardShell>;
}
