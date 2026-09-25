import { DashboardShell } from "@/components/layout/dashboard-shell";
import { RequestList } from "@/components/borrowing/request-list";
import { requirePageRole } from "@/lib/api/server";

export default async function SuperAdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const profile = await requirePageRole("super_admin");
  const { status } = await searchParams;
  return (
    <DashboardShell profile={profile} title="Borrowing requests">
      <RequestList
        key={status ?? "all"}
        area="super-admin"
        initialStatus={status}
      />
    </DashboardShell>
  );
}
