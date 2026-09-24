import { DashboardShell } from "@/components/layout/dashboard-shell";
import { RequestList } from "@/components/borrowing/request-list";
import { requirePageRole } from "@/lib/api/server";

export default async function PortalRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const profile = await requirePageRole("student_faculty");
  const { status } = await searchParams;
  return <DashboardShell profile={profile} title="Your borrowing requests"><RequestList key={status ?? "all"} area="portal" initialStatus={status} /></DashboardShell>;
}
