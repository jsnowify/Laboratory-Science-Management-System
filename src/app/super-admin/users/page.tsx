import { DashboardShell } from "@/components/layout/dashboard-shell";
import { UserManager } from "@/components/users/user-manager";
import { requirePageRole } from "@/lib/api/server";

export default async function UsersPage() {
  const profile = await requirePageRole("super_admin");
  return (
    <DashboardShell profile={profile} title="User accounts">
      <UserManager scope="super_admin" currentUserId={profile.id} />
    </DashboardShell>
  );
}
