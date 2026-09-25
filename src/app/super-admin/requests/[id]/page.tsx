import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  RequestSummary,
  type RequestDetail,
} from "@/components/borrowing/request-summary";
import { SuperAdminRequestActions } from "@/components/borrowing/super-admin-request-actions";
import { requirePageRole, serverApi } from "@/lib/api/server";

export default async function SuperAdminRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requirePageRole("super_admin");
  const { id } = await params;
  const request = await serverApi<RequestDetail>(
    `/api/v1/borrow-requests/${id}/`,
  );
  return (
    <DashboardShell profile={profile} title="Review borrowing request">
      <RequestSummary request={request}>
        <SuperAdminRequestActions request={request} />
      </RequestSummary>
    </DashboardShell>
  );
}
