import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AccountabilityTable } from "@/components/borrowing/accountability-table";
import { requirePageRole } from "@/lib/api/server";

export default async function PortalAccountabilityPage() {
  const profile = await requirePageRole("student_faculty");
  return <DashboardShell profile={profile} title="Your accountability records"><AccountabilityTable institutional={false} /></DashboardShell>;
}
