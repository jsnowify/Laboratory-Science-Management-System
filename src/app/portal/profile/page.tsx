import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AccountProfile } from "@/components/users/account-profile";
import { requirePageRole } from "@/lib/api/server";

export default async function ProfilePage() {
  const profile = await requirePageRole("student_faculty");
  return (
    <DashboardShell profile={profile} title="Your profile">
      <AccountProfile initial={profile} />
    </DashboardShell>
  );
}
