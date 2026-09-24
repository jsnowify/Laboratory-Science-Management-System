import { DashboardShell } from "@/components/layout/dashboard-shell";
import { RequestSummary, type RequestDetail } from "@/components/borrowing/request-summary";
import { StudentRequestActions } from "@/components/borrowing/student-request-actions";
import { requirePageRole, serverApi } from "@/lib/api/server";

export default async function PortalRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requirePageRole("student_faculty");
  const { id } = await params;
  const request = await serverApi<RequestDetail>(`/api/v1/borrow-requests/${id}/`);
  return <DashboardShell profile={profile} title="Borrowing request"><RequestSummary request={request}><StudentRequestActions id={id} status={request.status} /></RequestSummary></DashboardShell>;
}
